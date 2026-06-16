import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  addComment,
  createFeedPost,
  listComments,
  listFeed,
  repost,
  toggleLike
} from "@/lib/community/social";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const admin = createAdminClient();
  const postId = searchParams.get("postId");
  if (postId) {
    const comments = await listComments(admin, postId);
    return NextResponse.json({ comments });
  }
  const posts = await listFeed(admin, auth.user!.id, {
    cursor: searchParams.get("cursor") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    trending: searchParams.get("trending") === "1"
  });
  return NextResponse.json({ posts });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("post"),
    content: z.string().min(1).max(8000),
    postType: z.enum(["text", "prompt", "story", "ai_output", "result"]).default("text"),
    tags: z.array(z.string()).default([])
  }),
  z.object({ action: z.literal("like"), postId: z.string().uuid() }),
  z.object({ action: z.literal("comment"), postId: z.string().uuid(), content: z.string().min(1) }),
  z.object({ action: z.literal("repost"), postId: z.string().uuid() })
]);

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const admin = createAdminClient();
  const userId = auth.user!.id;
  if (parsed.data.action === "post") {
    await createFeedPost(admin, userId, parsed.data.content, parsed.data.postType, parsed.data.tags);
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "like") {
    const result = await toggleLike(admin, userId, parsed.data.postId);
    return NextResponse.json(result);
  }
  if (parsed.data.action === "comment") {
    const comment = await addComment(admin, userId, parsed.data.postId, parsed.data.content);
    return NextResponse.json({ comment });
  }
  await repost(admin, userId, parsed.data.postId);
  return NextResponse.json({ ok: true });
}
