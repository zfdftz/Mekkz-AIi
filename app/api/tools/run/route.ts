import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAIResponse } from "@/lib/ai";
import { generateImage } from "@/lib/image-gen";
import { buildLogoImagePrompt } from "@/lib/tools/logo-image";
import { getToolById } from "@/lib/tools/registry";
import { fetchPageText, fetchTikTokContext, fetchYouTubeContext, formatTikTokContext, formatYouTubeContext } from "@/lib/tools/web-utils";
import { fetchWebContext } from "@/lib/web-search";
import { createClient } from "@/lib/supabase/server";
import { resolveUserLanguage } from "@/lib/user-language";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReplyLanguageLock } from "@/lib/languages";
import { sleep } from "@/lib/plans";
import { consumeImageCreateSlot, tryGetUserPlanState } from "@/lib/user-plans";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().uuid(),
  toolId: z.string().min(1),
  values: z.record(z.string()),
  language: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { userId, toolId, values, language: requestedLanguage } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const tool = getToolById(toolId);
    if (!tool) {
      return NextResponse.json({ error: "Unknown tool." }, { status: 404 });
    }

    for (const field of tool.fields) {
      if (field.required && !values[field.id]?.trim()) {
        return NextResponse.json(
          { error: `Field "${field.label}" is required.` },
          { status: 400 }
        );
      }
    }

    const admin = createAdminClient();
    const userLanguage = await resolveUserLanguage(admin, userId, req, requestedLanguage);
    const userPrompt = tool.buildUserPrompt(values);
    let enrichedPrompt = userPrompt;
    let sources: string[] = [];

    if (toolId === "internet-mode") {
      const webContext = await fetchWebContext(values.query ?? userPrompt);
      if (webContext) {
        enrichedPrompt = `Query: ${userPrompt}\n\nWEB RESEARCH:\n${webContext}`;
        const sourceMatch = webContext.match(/Source: (https?:\/\/\S+)/);
        if (sourceMatch?.[1]) sources.push(sourceMatch[1]);
      }
    }

    if (toolId === "ai-browser" && values.url) {
      try {
        const pageText = await fetchPageText(values.url);
        enrichedPrompt = `URL: ${values.url}\n\nPAGE CONTENT:\n${pageText}\n\nTASK: ${values.question || "Summarize this page"}`;
        sources.push(values.url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not fetch page.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    if (toolId === "youtube-chat" && values.url) {
      try {
        const yt = await fetchYouTubeContext(values.url);
        enrichedPrompt = `${formatYouTubeContext(yt)}\n\nUSER REQUEST: ${values.question || "Summarize the video and analyze comments — who said what?"}`;
        sources.push(values.url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "YouTube fetch failed.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    if (toolId === "tiktok-chat" && values.url) {
      try {
        const tiktok = await fetchTikTokContext(values.url);
        enrichedPrompt = `${formatTikTokContext(tiktok)}\n\nUSER REQUEST: ${values.question || "What do you know about this TikTok profile/video and the comments?"}`;
        sources.push(values.url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "TikTok fetch failed.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    const replyLanguage = userLanguage;
    const systemContent =
      `You are MEKKZ AI Tool: ${tool.name}. ${tool.systemPrompt}\n` +
      `\n${buildReplyLanguageLock(replyLanguage)}`;

    const logoImagePrompt =
      toolId === "logo-generator" ? buildLogoImagePrompt(values) : undefined;

    const replyPromise = generateAIResponse(
      [
        { role: "system", content: systemContent },
        { role: "user", content: enrichedPrompt }
      ],
      { language: replyLanguage }
    );

    let image: string | undefined;
    let imageGenPrompt: string | undefined;
    let imageError: string | undefined;

    if (logoImagePrompt) {
      imageGenPrompt = logoImagePrompt;
      let imagePlanState;
      try {
        imagePlanState = await consumeImageCreateSlot(admin, userId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Bild-Limit erreicht.";
        return NextResponse.json(
          { error: message, plan: await tryGetUserPlanState(admin, userId) },
          { status: 429 }
        );
      }

      const startedAt = Date.now();
      const imagePromise = Promise.race([
        generateImage(logoImagePrompt),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Logo-Bild dauert zu lange. Bitte erneut versuchen.")),
            52000
          )
        )
      ]).then(async (result) => {
        if (imagePlanState.imageReadyDelayMs > 0) {
          const remaining = imagePlanState.imageReadyDelayMs - (Date.now() - startedAt);
          if (remaining > 0) await sleep(remaining);
        }
        return result.image;
      });

      const [replyResult, imageResult] = await Promise.allSettled([
        replyPromise,
        imagePromise
      ]);

      if (replyResult.status === "rejected") {
        throw replyResult.reason;
      }

      const reply = replyResult.value;

      if (imageResult.status === "fulfilled") {
        image = imageResult.value;
      } else {
        imageError =
          imageResult.reason instanceof Error
            ? imageResult.reason.message
            : "Logo-Bild konnte nicht erstellt werden.";
      }

      return NextResponse.json({
        reply,
        image,
        imageGenPrompt,
        imageError,
        sources,
        toolId: tool.id,
        toolName: tool.name
      });
    }

    const reply = await replyPromise;

    return NextResponse.json({
      reply,
      sources,
      toolId: tool.id,
      toolName: tool.name
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
