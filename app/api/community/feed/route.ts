import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  dataUrlByteSize,
  FEED_VIDEO_MAX_BYTES,
  moderateImage,
  moderateVideoPoster
} from "@/lib/community/media-safety";
import {
  addComment,
  createFeedPost,
  listComments,
  listFeed,
  repost,
  toggleLike
} from "@/lib/community/social";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorIdentityMap, authorFieldsFromIdentity } from "@/lib/rewards/identity";
import { syncUserRewards } from "@/lib/rewards/sync";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const admin = createAdminClient();
  const postId = searchParams.get("postId");
  if (postId) {
    const comments = await listComments(admin, postId);
    const ids = comments.map((c) => c.userId);
    const map = await getAuthorIdentityMap(admin, ids);
    return NextResponse.json({
      comments: comments.map((c) => {
        const id = map.get(c.userId);
        return {
          ...c,
          ...authorFieldsFromIdentity(id)
        };
      })
    });
  }
  await syncUserRewards(admin, auth.user!.id, auth.user!.email);
  const posts = await listFeed(admin, auth.user!.id, {
    cursor: searchParams.get("cursor") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    trending: searchParams.get("trending") === "1"
  });
  const ids = posts.map((p) => p.userId);
  const map = await getAuthorIdentityMap(admin, ids);
  return NextResponse.json({
    posts: posts.map((p) => {
      const id = map.get(p.userId);
      return {
        ...p,
        ...authorFieldsFromIdentity(id)
      };
    })
  });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("post"),
    content: z.string().max(8000).default(""),
    postType: z.enum(["text", "prompt", "story", "ai_output", "result"]).default("text"),
    tags: z.array(z.string()).default([]),
    imageUrl: z.string().nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    videoPosterUrl: z.string().nullable().optional()
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
    const { content, postType, tags, imageUrl, videoUrl, videoPosterUrl } = parsed.data;
    if (!content.trim() && !imageUrl && !videoUrl) {
      return NextResponse.json({ error: "Text oder Medien erforderlich." }, { status: 400 });
    }

    let mediaType: "none" | "image" | "video" = "none";
    let safeImage: string | null = null;
    let safeVideo: string | null = null;

    if (imageUrl) {
      const mod = await moderateImage(imageUrl);
      if (!mod.safe) {
        return NextResponse.json(
          { error: mod.reason ?? "Bild abgelehnt (Safety)." },
          { status: 400 }
        );
      }
      safeImage = imageUrl;
      mediaType = "image";
    }

    if (videoUrl) {
      const bytes = dataUrlByteSize(videoUrl);
      const poster = videoPosterUrl ?? "";
      const mod = await moderateVideoPoster(poster, bytes);
      if (!mod.safe) {
        return NextResponse.json(
          { error: mod.reason ?? "Video abgelehnt (Safety)." },
          { status: 400 }
        );
      }
      if (bytes > FEED_VIDEO_MAX_BYTES) {
        return NextResponse.json({ error: "Video zu groß (max. 20 MB)." }, { status: 400 });
      }
      safeVideo = videoUrl;
      mediaType = "video";
    }

    await createFeedPost(admin, userId, content.trim() || " ", postType, tags, {
      imageUrl: safeImage,
      videoUrl: safeVideo,
      mediaType
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "like") {
    const result = await toggleLike(admin, userId, parsed.data.postId);
    return NextResponse.json(result);
  }
  if (parsed.data.action === "comment") {
    const comment = await addComment(admin, userId, parsed.data.postId, parsed.data.content);
    const identity = await getAuthorIdentityMap(admin, [userId]);
    const id = identity.get(userId);
    return NextResponse.json({
      comment: {
        ...comment,
        ...authorFieldsFromIdentity(id)
      }
    });
  }
  await repost(admin, userId, parsed.data.postId);
  return NextResponse.json({ ok: true });
}
