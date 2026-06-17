import { NextResponse, after } from "next/server";
import { z } from "zod";
import { generateAIResponse, streamAIResponse } from "@/lib/ai";
import { encodeChatStreamEvent } from "@/lib/chat-stream";
import { insertConversationMessage, messagesForAI, selectRelevantChatHistory } from "@/lib/chat-storage";
import { extractImagePrompt, generateImage } from "@/lib/image-gen";
import { wantsImageGeneration as detectImageRequest } from "@/lib/image-intent";
import { buildPollinationsImageProxyPath } from "@/lib/pollinations-url";
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
  assertCanSendChatMessage,
  buildPlanSystemPrompt,
  consumeImageCreateSlot,
  consumeUploadSlot,
  getConversationLimitState,
  getUserPlanState,
  tryGetUserPlanState
} from "@/lib/user-plans";
import { isGuestUser } from "@/lib/auth/session";
import { hasUserProfile } from "@/lib/community/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe";
import { syncUserPlanFromStripe } from "@/lib/stripe-sync";
import {
  buildImageAnalysisLanguagePrompt,
  buildLanguageSystemPrompt,
  buildReplyLanguageLock,
  resolveReplyLanguage,
  type LanguageCode
} from "@/lib/languages";
import { resolveUserLanguage } from "@/lib/user-language";
import {
  buildWebContextPrompt,
  fetchWebContext,
  needsWebLookup
} from "@/lib/web-search";
import {
  autoSaveMemoriesFromMessage,
  buildMemorySystemPrompt,
  getMemoriesForPrompt
} from "@/lib/memory";
import {
  buildPersonalityLock,
  buildPersonalitySystemPrompt
} from "@/lib/personality";
import { buildTutorSystemPrompt } from "@/lib/tutor";
import {
  buildCustomInstructionsPrompt,
  getUserAiPreferences,
  setUserAiPreferences
} from "@/lib/user-ai-preferences";
import { buildFollowUpQuestionPrompt } from "@/lib/chat-follow-ups";
import { buildSongLyricsResponsePrompt, looksLikeSongLyrics } from "@/lib/song-lyrics-context";
import { normalizePersonalityMode } from "@/lib/personality";
import {
  applyChatLineFormat,
  buildChatFormatInstructions,
  buildChatUserContextPrompt,
  stripAssistantChatPrefix
} from "@/lib/chat-user-context";
import { buildExtendedUserActivityContext, looksLikeMessageLookup } from "@/lib/chat-user-activity-context";
import {
  getDefaultConversationTitle,
  isDefaultConversationTitle
} from "@/lib/i18n/conversation-title";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
  messages: z.array(messageSchema).min(1),
  language: z.string().min(2).max(8).optional(),
  personalityMode: z
    .enum([
      "normal",
      "gamer",
      "teacher",
      "business",
      "swiss",
      "genz",
      "hardcore_coach",
      "philosopher",
      "comedian",
      "hype",
      "sarcastic"
    ])
    .optional(),
  generateImage: z.boolean().optional(),
  stream: z.boolean().optional()
});

function buildTitle(text: string, language: LanguageCode) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 42
    ? `${clean.slice(0, 42)}...`
    : clean || getDefaultConversationTitle(language);
}

function normalizeGeneratedImageForClient(
  image: string | undefined,
  prompt?: string
) {
  if (!image || !prompt) return image;
  if (image.startsWith("/api/pollinations-image")) return image;
  if (image.startsWith("http") && /pollinations\.ai/i.test(image)) {
    return buildPollinationsImageProxyPath(prompt);
  }
  return image;
}

export async function POST(req: Request) {
  try {
  const admin = createAdminClient();
  const body = await req.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Anfrage. Bitte Seite neu laden und erneut versuchen." },
      { status: 400 }
    );
  }

  const {
    userId,
    messages: rawMessages,
    language: requestedLanguage,
    personalityMode: clientPersonalityMode,
    generateImage: clientGenerateImage,
    stream: wantsStream
  } = parsed.data;
  let { conversationId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  if (!isGuestUser(user)) {
    const hasProfile = await hasUserProfile(admin, user.id);
    if (!hasProfile) {
      return NextResponse.json(
        { error: "Bitte zuerst dein Profil einrichten.", needsOnboarding: true },
        { status: 403 }
      );
    }
  }

  if (!isGuestUser(user) && isStripeConfigured() && user.email) {
    after(async () => {
      try {
        await syncUserPlanFromStripe(admin, user.id, user.email!);
      } catch {
        // Plan sync is best-effort and must not slow chat replies.
      }
    });
  }

  const messages = rawMessages.filter(
    (m) => m.content.trim().length > 0 || (m.images && m.images.length > 0)
  );
  if (messages.length === 0) {
    return NextResponse.json({ error: "Keine gültige Nachricht gesendet." }, { status: 400 });
  }
  const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);
  const userLanguage = await resolveUserLanguage(
    admin,
    userId,
    req,
    requestedLanguage
  );

  if (!conversationId) {
    const titleSource =
      lastUserMessage?.content?.trim() ||
      (lastUserMessage?.imageName ? `Bild: ${lastUserMessage.imageName}` : "");
    const { data: created, error: createError } = await admin
      .from("conversations")
      .insert({
        user_id: userId,
        title: titleSource
          ? buildTitle(titleSource, userLanguage)
          : getDefaultConversationTitle(userLanguage)
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
    return NextResponse.json(
      { error: message, plan: await tryGetUserPlanState(admin, userId) },
      { status: 429 }
    );
  }

  const hasImageInLastMessage = Boolean(lastUserMessage?.images?.length);
  const userText = lastUserMessage?.content?.trim() ?? "";
  const contextMessages = selectRelevantChatHistory(messages);
  const needsActivityContext =
    looksLikeMessageLookup(userText) ||
    /\b(notiz|notes?|feed|post|community|gruppe|freund|nachricht an|habe ich|did i|geschrieben|gesagt)\b/i.test(
      userText
    );

  const [memoryText, storedAiPreferences, planState, chatContext, activityContext] =
    await Promise.all([
      getMemoriesForPrompt(admin, userId),
      getUserAiPreferences(admin, userId),
      getUserPlanState(admin, userId),
      buildChatUserContextPrompt(admin, userId, user.email),
      needsActivityContext
        ? buildExtendedUserActivityContext(admin, userId, { searchHint: userText })
        : Promise.resolve("")
    ]);

  const aiPreferences = clientPersonalityMode
    ? {
        ...storedAiPreferences,
        personalityMode: normalizePersonalityMode(clientPersonalityMode)
      }
    : storedAiPreferences;

  if (
    clientPersonalityMode &&
    normalizePersonalityMode(clientPersonalityMode) !== storedAiPreferences.personalityMode
  ) {
    after(async () => {
      try {
        await setUserAiPreferences(admin, userId, {
          personalityMode: aiPreferences.personalityMode
        });
      } catch {
        // Best-effort sync from client cache.
      }
    });
  }

  const userTurnCount = messages.filter((message) => message.role === "user").length;
  const followUpPrompt = buildFollowUpQuestionPrompt(userId, userTurnCount, userText);
  const songLyricsPrompt = looksLikeSongLyrics(userText) ? buildSongLyricsResponsePrompt() : "";

  const stylePrompt = await getCommunicationStylePrompt(
    admin,
    userId,
    aiPreferences.personalityMode
  );
  const chatLimitState = await getConversationLimitState(
    admin,
    userId,
    conversationId,
    planState.plan
  );
  const planRules = buildPlanSystemPrompt(planState, chatLimitState);
  const replyLanguage = resolveReplyLanguage(userText, userLanguage);
  const willGenerateImage =
    !lastUserMessage?.images?.length &&
    (detectImageRequest(userText) || clientGenerateImage === true);

  if (isGuestUser(user) && (willGenerateImage || hasImageInLastMessage)) {
    return NextResponse.json(
      {
        error:
          "Melde dich zuerst an, um Bilder zu erstellen oder zu senden.",
        code: "AUTH_REQUIRED"
      },
      { status: 403 }
    );
  }

  let systemContent =
    "You are MEKKZ AI — the assistant of this app (not ChatGPT, Claude, Groq, or any other product). " +
    buildLanguageSystemPrompt() +
    " ";

  if (hasImageInLastMessage) {
    systemContent += buildImageAnalysisLanguagePrompt() + " ";
  } else {
    systemContent +=
      "Never fake generated images: no [Bild:...], [Image:...], markdown image syntax, or detailed visual descriptions pretending an image was created. " +
      "If the user wants a new image, reply in one short sentence that real image generation happens in the app — do not describe the scene.";
  }

  if (!willGenerateImage && !hasImageInLastMessage && needsWebLookup(userText)) {
    try {
      const webContext = await fetchWebContext(userText);
      if (webContext) {
        systemContent += buildWebContextPrompt(webContext) + " ";
      }
    } catch {
      // Web lookup is best-effort.
    }
  }

  const system = {
    role: "system" as const,
    content:
      systemContent +
      `${planRules}\n` +
      `${buildPersonalitySystemPrompt(aiPreferences.personalityMode, userLanguage)}\n` +
      (aiPreferences.tutorModeEnabled
        ? `${buildTutorSystemPrompt(aiPreferences.tutorLevel)}\n`
        : "") +
      (stylePrompt ? `${stylePrompt}\n` : "") +
      `${buildCustomInstructionsPrompt(aiPreferences.customInstructions)}\n` +
      `${buildMemorySystemPrompt(memoryText)}\n` +
      `${chatContext.prompt}\n` +
      `${activityContext}\n` +
      `${buildChatFormatInstructions(chatContext.username)}\n` +
      `${songLyricsPrompt ? `${songLyricsPrompt}\n` : ""}` +
      `${followUpPrompt}\n` +
      `${buildPersonalityLock(aiPreferences.personalityMode, userLanguage)}\n` +
      `\n${buildReplyLanguageLock(replyLanguage)}`
  };

  let reply = "";
  let generatedImage: string | undefined;
  let imageGenPrompt: string | undefined;
  let imageCategory: string | undefined;
  let latestPlanState = planState;

  if (lastUserMessage?.images?.length) {
    imageCategory = categorizeUploadedImage(
      lastUserMessage.imageName,
      lastUserMessage.content
    );
  }

  try {
    const shouldGenerateImage = willGenerateImage;

    if (lastUserMessage?.images?.length) {
      try {
        latestPlanState = await consumeUploadSlot(admin, userId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload-Limit erreicht.";
        return NextResponse.json(
          { error: message, plan: await tryGetUserPlanState(admin, userId) },
          { status: 429 }
        );
      }
    }

    if (shouldGenerateImage) {
      let imagePlanState;
      try {
        imagePlanState = await consumeImageCreateSlot(admin, userId);
        latestPlanState = imagePlanState;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Bild-Limit erreicht.";
        return NextResponse.json(
          { error: message, plan: await tryGetUserPlanState(admin, userId) },
          { status: 429 }
        );
      }

      const prompt = extractImagePrompt(userText);

      imageGenPrompt = prompt;

      const imageStartedAt = Date.now();
      const imageTimeoutMs = 58000;
      const result = await Promise.race([
        generateImage(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout: Bild-Erstellung dauert zu lange.")),
            imageTimeoutMs
          )
        )
      ]);
      generatedImage = result.image;

      if (imagePlanState.imageReadyDelayMs > 0) {
        const remaining =
          imagePlanState.imageReadyDelayMs - (Date.now() - imageStartedAt);
        if (remaining > 0) {
          await sleep(remaining);
        }
      }

      imageCategory = categorizeGeneratedPrompt(prompt);
      reply = "";
    } else if (wantsStream !== false) {
      let storedUserImage = lastUserMessage?.images?.[0] ?? null;
      if (storedUserImage) {
        storedUserImage = await persistChatImage(
          admin,
          userId,
          conversationId,
          storedUserImage,
          "user"
        );
      }

      const storedUserText =
        lastUserMessage?.content?.trim() ||
        (lastUserMessage?.imageName ? `[Bild: ${lastUserMessage.imageName}]` : "");

      const aiMessages = [
        system,
        ...applyChatLineFormat(messagesForAI(contextMessages), chatContext.username)
      ];
      const streamLanguage = replyLanguage;
      const streamTimeoutMs = hasImageInLastMessage ? 90000 : 45000;

      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          const emit = (event: Parameters<typeof encodeChatStreamEvent>[0]) => {
            controller.enqueue(encodeChatStreamEvent(event));
          };

          let fullReply = "";
          let streamError: string | null = null;

          try {
            emit({
              type: "meta",
              conversationId,
              ...(storedUserImage ? { userImage: storedUserImage } : {})
            });

            const streamTask = (async () => {
              if (planState.textReadyDelayMs > 0) {
                await sleep(planState.textReadyDelayMs);
              }
              for await (const chunk of streamAIResponse(aiMessages, {
                language: streamLanguage
              })) {
                fullReply += chunk;
                if (chunk) {
                  emit({ type: "delta", text: chunk });
                }
              }
            })();

            await Promise.race([
              streamTask,
              new Promise<never>((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        "Timeout: Bild/Text-Analyse dauert zu lange. Bitte erneut versuchen."
                      )
                    ),
                  streamTimeoutMs
                )
              )
            ]);

            const parsedCategory = parseCategoryFromAnalysis(fullReply);
            if (parsedCategory) imageCategory = parsedCategory;
            fullReply = stripAssistantChatPrefix(fullReply);

            const { error: insertError } = await insertConversationMessage(admin, {
              user_id: userId,
              conversation_id: conversationId,
              user_message: storedUserText,
              assistant_message: fullReply,
              user_image: storedUserImage,
              image_name: lastUserMessage?.imageName ?? null,
              assistant_image: null,
              user_image_category: lastUserMessage?.images?.length
                ? imageCategory ?? null
                : null,
              assistant_image_category: null
            });

            if (storedUserText) {
              after(async () => {
                try {
                  await autoSaveMemoriesFromMessage(admin, userId, storedUserText);
                  await refreshUserCommunicationStyle(admin, userId);

                  const { data: conversation } = await admin
                    .from("conversations")
                    .select("title")
                    .eq("id", conversationId)
                    .single();

                  if (isDefaultConversationTitle(conversation?.title)) {
                    await admin
                      .from("conversations")
                      .update({
                        title: buildTitle(storedUserText, userLanguage),
                        updated_at: new Date().toISOString()
                      })
                      .eq("id", conversationId);
                  } else {
                    await admin
                      .from("conversations")
                      .update({ updated_at: new Date().toISOString() })
                      .eq("id", conversationId);
                  }
                } catch {
                  // Background enrichment must not block chat replies.
                }
              });
            }

            emit({
              type: "done",
              reply: fullReply,
              conversationId,
              ...(storedUserImage ? { userImage: storedUserImage } : {}),
              ...(imageCategory ? { imageCategory } : {}),
              plan: latestPlanState,
              conversationLimit: await getConversationLimitState(
                admin,
                userId,
                conversationId
              ),
              ...(insertError
                ? {
                    warning:
                      insertError.message ||
                      "Chat-Verlauf konnte nicht vollständig gespeichert werden."
                  }
                : {})
            });
          } catch (error) {
            streamError =
              error instanceof Error
                ? error.message
                : "KI-Antwort konnte nicht erzeugt werden.";
            emit({ type: "error", error: streamError });
          } finally {
            controller.close();
          }
        }
      });

      return new Response(body, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive"
        }
      });
    } else {
      if (planState.textReadyDelayMs > 0) {
        await sleep(planState.textReadyDelayMs);
      }
      reply = await Promise.race([
        generateAIResponse(
          [system, ...applyChatLineFormat(messagesForAI(contextMessages), chatContext.username)],
          {
            language: replyLanguage
          }
        ),
        new Promise<string>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Timeout: Bild/Text-Analyse dauert zu lange. Bitte erneut versuchen."
                )
              ),
            hasImageInLastMessage ? 90000 : 45000
          )
        )
      ]);

      const parsedCategory = parseCategoryFromAnalysis(reply);
      if (parsedCategory) imageCategory = parsedCategory;
      reply = stripAssistantChatPrefix(reply);
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

  if (storedAssistantImage && !storedAssistantImage.startsWith("http")) {
    // Base64/db: sofort zurückgeben — kein langsamer Storage-Upload vor der Antwort.
  } else if (storedAssistantImage) {
    storedAssistantImage = await persistChatImage(
      admin,
      userId,
      conversationId,
      storedAssistantImage,
      "assistant"
    );
  }

  const responseImage = normalizeGeneratedImageForClient(
    generatedImage ?? storedAssistantImage ?? undefined,
    imageGenPrompt
  );

  const { error: insertError } = await insertConversationMessage(admin, {
    user_id: userId,
    conversation_id: conversationId,
    user_message: storedUserText,
    assistant_message: reply,
    user_image: storedUserImage,
    image_name: lastUserMessage?.imageName ?? null,
    assistant_image: generatedImage ?? storedAssistantImage,
    user_image_category: lastUserMessage?.images?.length ? imageCategory ?? null : null,
    assistant_image_category: generatedImage ? imageCategory ?? null : null
  });

  if (insertError) {
    if (generatedImage) {
      return NextResponse.json({
        reply,
        generatedImage: responseImage ?? generatedImage,
        imageCategory,
        imageGenPrompt,
        conversationId,
        userImage: storedUserImage,
        plan: await getUserPlanState(admin, userId),
        conversationLimit: await getConversationLimitState(admin, userId, conversationId),
        warning: "Bild erstellt, Chat-Verlauf konnte nicht vollständig gespeichert werden."
      });
    }

    return NextResponse.json(
      { error: insertError.message || "Chat konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }

  if (storedUserText) {
    after(async () => {
      try {
        await autoSaveMemoriesFromMessage(admin, userId, storedUserText);
        await refreshUserCommunicationStyle(admin, userId);

        const { data: conversation } = await admin
          .from("conversations")
          .select("title")
          .eq("id", conversationId)
          .single();

        if (isDefaultConversationTitle(conversation?.title)) {
          await admin
            .from("conversations")
            .update({
              title: buildTitle(storedUserText, userLanguage),
              updated_at: new Date().toISOString()
            })
            .eq("id", conversationId);
        } else {
          await admin
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        }
      } catch {
        // Background enrichment must not block chat replies.
      }
    });
  }

  return NextResponse.json({
    reply,
    generatedImage: responseImage ?? undefined,
    imageGenPrompt,
    userImage: storedUserImage ?? undefined,
    imageCategory,
    conversationId,
    plan: latestPlanState,
    conversationLimit: await getConversationLimitState(admin, userId, conversationId)
  });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Anfrage konnte nicht verarbeitet werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
