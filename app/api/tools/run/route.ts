import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAIResponse } from "@/lib/ai";
import { getToolById } from "@/lib/tools/registry";
import { fetchPageText, fetchYouTubeContext, formatYouTubeContext } from "@/lib/tools/web-utils";
import { fetchWebContext } from "@/lib/web-search";
import { createClient } from "@/lib/supabase/server";
import { resolveUserLanguage } from "@/lib/user-language";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReplyLanguageLock, resolveReplyLanguage } from "@/lib/languages";

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
        enrichedPrompt = `${formatYouTubeContext(yt)}\n\nUSER REQUEST: ${values.question || "Summarize and list key points"}`;
        sources.push(values.url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "YouTube fetch failed.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    const replyLanguage = resolveReplyLanguage(userPrompt, userLanguage);
    const systemContent =
      `You are MEKKZ AI Tool: ${tool.name}. ${tool.systemPrompt}\n` +
      (replyLanguage ? `\n${buildReplyLanguageLock(replyLanguage)}` : "");

    const reply = await generateAIResponse(
      [
        { role: "system", content: systemContent },
        { role: "user", content: enrichedPrompt }
      ],
      { language: replyLanguage ?? userLanguage }
    );

    return NextResponse.json({ reply, sources, toolId: tool.id, toolName: tool.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
