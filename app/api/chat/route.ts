import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAIResponse } from "@/lib/ai";
import { insertConversationMessage, messagesForAI } from "@/lib/chat-storage";
import { extractImagePrompt, generateImage, wantsImageGeneration } from "@/lib/image-gen";
import {
  categorizeGeneratedPrompt,
  categorizeUploadedImage,
  parseCategoryFromAnalysis
} from "@/lib/image-categories";
import { persistChatImage } from "@/lib/image-persistence";
import {
  getCommunicationStylePrompt,
  refreshUserCommunicationStyle
} from "@/lib/communication-style";
import { sleep } from "@/lib/plans";
import {
  assertCanGenerateImage,
  assertCanSendChatMessage,
  assertCanSendImage,
  getConversationLimitState,
  getUserPlanState,
  incrementImageUsage,
  incrementUploadUsage
} from "@/lib/user-plans";
import { createClient } from "@supabase/supabase-js";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  images: z.array(z.string()).optional(),
  imageName: z.string().optional(),
  generatedImage: z.string().optional(),
  imageCategory: z.string().optional()
});

const payloadSchema = z.object({
  userId: z.string().uuid(),
  conversationId: z.string().uuid().nullish(),
  messages: z.array(messageSchema).min(1)
});

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildTitle(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean || "Neuer Chat";
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Anfrage. Bitte Seite neu laden und erneut versuchen." },
      { status: 400 }
    );
  }

  const { userId, messages: rawMessages } = parsed.data;
  let { conversationId } = parsed.data;
  const messages = rawMessages.filter(
    (m) => m.content.trim().length > 0 || (m.images && m.images.length > 0)
  );
  if (messages.length === 0) {
    return NextResponse.json({ error: "Keine gültige Nachricht gesendet." }, { status: 400 });
  }
  const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);

  if (!conversationId) {
    const titleSource =
      lastUserMessage?.content?.trim() ||
      (lastUserMessage?.imageName ? `Bild: ${lastUserMessage.imageName}` : "Neuer Chat");
    const { data: created, error: createError } = await admin
      .from("conversations")
      .insert({
        user_id: userId,
        title: buildTitle(titleSource)
      })
      .select("id")
      .single();

    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message || "Conversation konnte nicht erstellt werden." },
        { status: 500 }
      );
    }
    conversationId = created.id;
  }

  if (!conversationId) {
    return NextResponse.json({ error: "Conversation fehlt." }, { status: 500 });
  }

  try {
    await assertCanSendChatMessage(admin, userId, conversationId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat-Limit erreicht.";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const { data: memoryRows } = await admin
    .from("user_memory")
    .select("memory")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const memoryText = (memoryRows ?? []).map((x) => `- ${x.memory}`).join("\n");
  const stylePrompt = await getCommunicationStylePrompt(admin, userId);
  const hasImageInLastMessage = Boolean(lastUserMessage?.images?.length);
  const system = {
    role: "system" as const,
    content:
      "You are mekkz AI. Reply in German. Be concise, direct, and premium in tone. " +
      "For normal text questions, prefer short answers (about 2-5 sentences) unless the user asks for detail. " +
      "When the user sends an image, analyze it in German using EXACTLY these sections:\n" +
      "**Kategorie:** (choose one: Landschaft, Person, Tier, Essen, Dokument, Screenshot, Kunst, Objekt, Sonstiges)\n" +
      "**Hauptinhalt:** (what is visible)\n" +
      "**Farben & Stil:** (colors, mood, style)\n" +
      "**Details:** (important small details)\n" +
      "For image creation, users can write e.g. 'Mach ein Bild von ...', 'Erstelle ein Bild von ...' or '/bild ...'.\n" +
      (stylePrompt ? `${stylePrompt}\n` : "") +
      "User memory:\n" +
      (memoryText || "No memory yet.")
  };

  let reply = "";
  let generatedImage: string | undefined;
  let imageCategory: string | undefined;

  if (lastUserMessage?.images?.length) {
    imageCategory = categorizeUploadedImage(
      lastUserMessage.imageName,
      lastUserMessage.content
    );
  }

  try {
    const userText = lastUserMessage?.content?.trim() ?? "";
    const shouldGenerateImage =
      wantsImageGeneration(userText) && !lastUserMessage?.images?.length;

    if (lastUserMessage?.images?.length) {
      try {
        await assertCanSendImage(admin, userId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload-Limit erreicht.";
        return NextResponse.json({ error: message }, { status: 429 });
      }
    }

    if (shouldGenerateImage) {
      let planState;
      try {
        planState = await assertCanGenerateImage(admin, userId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Bild-Limit erreicht.";
        return NextResponse.json({ error: message }, { status: 429 });
      }

      const prompt = extractImagePrompt(userText);
      const result = await Promise.race([
        generateImage(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout: Bild-Erstellung dauert zu lange.")),
            180000
          )
        )
      ]);
      generatedImage = result.image;
      imageCategory = categorizeGeneratedPrompt(prompt);
      reply = "";

      if (planState.imageReadyDelayMs > 0) {
        await sleep(planState.imageReadyDelayMs);
      }

      await incrementImageUsage(admin, userId);
    } else {
      reply = await Promise.race([
        generateAIResponse([system, ...messagesForAI(messages)], "ollama"),
        new Promise<string>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Timeout: Bild/Text-Analyse dauert zu lange. Bitte erneut versuchen."
                )
              ),
            hasImageInLastMessage ? 120000 : 90000
          )
        )
      ]);

      const parsedCategory = parseCategoryFromAnalysis(reply);
      if (parsedCategory) imageCategory = parsedCategory;

      const planState = await getUserPlanState(admin, userId);
      if (planState.textReadyDelayMs > 0) {
        await sleep(planState.textReadyDelayMs);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "KI-Antwort konnte nicht erzeugt werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const storedUserText =
    lastUserMessage?.content?.trim() ||
    (lastUserMessage?.imageName ? `[Bild: ${lastUserMessage.imageName}]` : "");

  let storedUserImage = lastUserMessage?.images?.[0] ?? null;
  let storedAssistantImage = generatedImage ?? null;

  if (storedUserImage) {
    storedUserImage = await persistChatImage(
      admin,
      userId,
      conversationId,
      storedUserImage,
      "user"
    );
  }

  if (storedAssistantImage) {
    storedAssistantImage = await persistChatImage(
      admin,
      userId,
      conversationId,
      storedAssistantImage,
      "assistant"
    );
  }

  const { error: insertError } = await insertConversationMessage(admin, {
    user_id: userId,
    conversation_id: conversationId,
    user_message: storedUserText,
    assistant_message: reply,
    user_image: storedUserImage,
    image_name: lastUserMessage?.imageName ?? null,
    assistant_image: storedAssistantImage,
    user_image_category: lastUserMessage?.images?.length ? imageCategory ?? null : null,
    assistant_image_category: generatedImage ? imageCategory ?? null : null
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message || "Chat konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }

  if (lastUserMessage?.images?.length) {
    await incrementUploadUsage(admin, userId);
  }

  if (storedUserText) {
    await admin.from("user_memory").insert({
      user_id: userId,
      memory: storedUserText.slice(0, 220)
    });

    await refreshUserCommunicationStyle(admin, userId);

    const { data: conversation } = await admin
      .from("conversations")
      .select("title")
      .eq("id", conversationId)
      .single();

    if (conversation?.title === "Neuer Chat") {
      await admin
        .from("conversations")
        .update({
          title: buildTitle(storedUserText),
          updated_at: new Date().toISOString()
        })
        .eq("id", conversationId);
    } else {
      await admin
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
  }

  return NextResponse.json({
    reply,
    generatedImage: storedAssistantImage ?? undefined,
    userImage: storedUserImage ?? undefined,
    imageCategory,
    conversationId,
    plan: await getUserPlanState(admin, userId),
    conversationLimit: await getConversationLimitState(admin, userId, conversationId)
  });
}
