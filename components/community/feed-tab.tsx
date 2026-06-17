"use client";

import { Heart, MessageCircle, Repeat2, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ChatComposer,
  EmptyState,
  ErrorBanner,
  FieldLabel,
  GhostButton,
  LoadingState,
  Panel,
  PillTabs,
  PrimaryButton,
  TextArea,
  TextInput
} from "@/components/community/shared";
import { ProfileLink } from "@/components/community/profile-context";
import { ProfileIdentity } from "@/components/rewards/profile-identity";
import { FEED_IMAGE_MAX_BYTES, FEED_VIDEO_MAX_SECONDS } from "@/lib/community/media-safety";
import { readJsonResponse } from "@/lib/fetch-json";
import type { FeedComment, FeedPost } from "@/lib/community/types";

export function FeedTab() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trending, setTrending] = useState(false);
  const [tag, setTag] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<FeedPost["postType"]>("text");
  const [tagsInput, setTagsInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoPoster, setVideoPoster] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const load = useCallback(async (append = false) => {
    setError(null);
    if (!append) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (trending) params.set("trending", "1");
      if (tag.trim()) params.set("tag", tag.trim());
      if (append && posts.length > 0) params.set("cursor", posts[posts.length - 1].createdAt);
      const res = await fetch(`/api/community/feed?${params}`);
      const data = await readJsonResponse<{ posts?: FeedPost[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Feed konnte nicht geladen werden.");
      setPosts((prev) => (append ? [...prev, ...(data.posts ?? [])] : data.posts ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, [trending, tag, posts]);

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trending, tag]);

  async function createPost() {
    if (!content.trim() && !imagePreview && !videoPreview) return;
    setPosting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/community/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "post",
          content,
          postType,
          tags,
          imageUrl: imagePreview,
          videoUrl: videoPreview,
          videoPosterUrl: videoPoster
        })
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Post fehlgeschlagen.");
      setContent("");
      setTagsInput("");
      setImagePreview(null);
      setVideoPreview(null);
      setVideoPoster(null);
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setPosting(false);
    }
  }

  async function onImagePick(file: File | null) {
    if (!file) return;
    if (file.size > FEED_IMAGE_MAX_BYTES) {
      setError(`Bild max. ${FEED_IMAGE_MAX_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    setMediaBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : null);
      setVideoPreview(null);
      setVideoPoster(null);
      setMediaBusy(false);
    };
    reader.readAsDataURL(file);
  }

  async function onVideoPick(file: File | null) {
    if (!file) return;
    setMediaBusy(true);
    setError(null);
    try {
      const duration = await getVideoDuration(file);
      if (duration > FEED_VIDEO_MAX_SECONDS) {
        setError(`Video max. ${FEED_VIDEO_MAX_SECONDS} Sekunden.`);
        return;
      }
      const poster = await captureVideoFrame(file);
      const dataUrl = await readFileDataUrl(file);
      setVideoPreview(dataUrl);
      setVideoPoster(poster);
      setImagePreview(null);
    } catch {
      setError("Video konnte nicht geladen werden.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function toggleLike(postId: string) {
    const res = await fetch("/api/community/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like", postId })
    });
    const data = await readJsonResponse<{ liked?: boolean; error?: string }>(res);
    if (!res.ok) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: data.liked,
              likesCount: p.likesCount + (data.liked ? 1 : -1)
            }
          : p
      )
    );
  }

  async function repostPost(postId: string) {
    await fetch("/api/community/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "repost", postId })
    });
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, repostsCount: p.repostsCount + 1 } : p))
    );
  }

  async function loadComments(postId: string) {
    if (expanded === postId) {
      setExpanded(null);
      return;
    }
    setExpanded(postId);
    const res = await fetch(`/api/community/feed?postId=${postId}`);
    const data = await readJsonResponse<{ comments?: FeedComment[] }>(res);
    setComments((prev) => ({ ...prev, [postId]: data.comments ?? [] }));
  }

  async function sendComment(postId: string) {
    const text = commentDraft[postId]?.trim();
    if (!text) return;
    const res = await fetch("/api/community/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", postId, content: text })
    });
    const data = await readJsonResponse<{ comment?: FeedComment; error?: string }>(res);
    if (!res.ok) return;
    setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
    if (data.comment) {
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), data.comment!]
      }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
      );
    }
  }

  return (
    <div className="space-y-6">
      <PillTabs
        items={[
          { id: "latest", label: "Neueste" },
          { id: "trending", label: "Trending", icon: TrendingUp }
        ]}
        value={trending ? "trending" : "latest"}
        onChange={(id) => setTrending(id === "trending")}
      />

      <Panel>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <TextInput
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Nach Tag filtern…"
            className="sm:max-w-xs"
          />
        </div>
        <FieldLabel>Neuer Post</FieldLabel>
        <div className="mb-3 flex flex-wrap gap-2">
          {(["text", "prompt", "story", "ai_output", "result"] as const).map((type) => (
            <GhostButton
              key={type}
              className={postType === type ? "community-nav-active" : ""}
              onClick={() => setPostType(type)}
            >
              {type}
            </GhostButton>
          ))}
        </div>
        <TextArea rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Was möchtest du teilen?" />
        <div className="mt-3 flex flex-wrap gap-3 text-base text-muted">
          <label className="cursor-pointer rounded-lg border border-white/10 px-4 py-2.5 hover:bg-white/5">
            📷 Bild
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onImagePick(e.target.files?.[0] ?? null)} />
          </label>
          <label className="cursor-pointer rounded-lg border border-white/10 px-4 py-2.5 hover:bg-white/5">
            🎬 Video (&lt;30s)
            <input type="file" accept="video/*" className="hidden" onChange={(e) => onVideoPick(e.target.files?.[0] ?? null)} />
          </label>
          {mediaBusy ? <span>KI Safety-Check beim Upload…</span> : null}
          <span className="text-sm">Medien werden per KI auf unangemessene Inhalte geprüft.</span>
        </div>
        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreview} alt="" className="mt-2 max-h-40 rounded-xl object-cover" />
        ) : null}
        {videoPreview ? (
          <video src={videoPreview} controls className="mt-2 max-h-48 w-full rounded-xl" />
        ) : null}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags (kommagetrennt)"
            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-base"
          />
          <PrimaryButton loading={posting} onClick={createPost}>
            Posten
          </PrimaryButton>
        </div>
      </Panel>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingState />
      ) : posts.length === 0 ? (
        <EmptyState>Noch keine Posts — sei der Erste!</EmptyState>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Panel key={post.id} className="animate-in fade-in">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ProfileLink userId={post.userId} className="min-w-0">
                    <ProfileIdentity
                      compact
                      username={post.authorName ?? "user"}
                      title={post.authorTitle}
                      isVerified={post.authorVerified}
                      isCreator={post.authorCreator}
                      isChosen={post.authorChosen}
                      isUltraCreator={post.authorUltraCreator}
                    />
                  </ProfileLink>
                  <span className="shrink-0 rounded-md bg-white/10 px-2.5 py-0.5 text-xs uppercase">
                    {post.postType}
                  </span>
                </div>
                <span className="text-sm text-muted">{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-[17px] leading-relaxed sm:text-lg">{post.content}</p>
              {post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.imageUrl} alt="" className="mt-2 max-h-80 w-full rounded-xl object-cover" />
              ) : null}
              {post.videoUrl ? (
                <video src={post.videoUrl} controls className="mt-2 max-h-80 w-full rounded-xl" />
              ) : null}
              {post.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {post.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className="rounded-full bg-primary/15 px-3 py-1 text-sm text-primary"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <GhostButton onClick={() => toggleLike(post.id)}>
                  <Heart size={16} className={`mr-1.5 inline ${post.likedByMe ? "fill-red-400 text-red-400" : ""}`} />
                  {post.likesCount}
                </GhostButton>
                <GhostButton onClick={() => loadComments(post.id)}>
                  <MessageCircle size={16} className="mr-1.5 inline" />
                  {post.commentsCount}
                </GhostButton>
                <GhostButton onClick={() => repostPost(post.id)}>
                  <Repeat2 size={16} className="mr-1.5 inline" />
                  {post.repostsCount}
                </GhostButton>
              </div>
              {expanded === post.id ? (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  {(comments[post.id] ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg bg-black/20 px-4 py-3.5 text-[17px] sm:text-lg">
                      <ProfileLink userId={c.userId} className="mb-1 block">
                        <ProfileIdentity
                          compact
                          username={c.authorName ?? "user"}
                          title={c.authorTitle}
                          isVerified={c.authorVerified}
                          isCreator={c.authorCreator}
                          isChosen={c.authorChosen}
                          isUltraCreator={c.authorUltraCreator}
                        />
                      </ProfileLink>
                      <p className="text-muted">{c.content}</p>
                    </div>
                  ))}
                  <ChatComposer
                    value={commentDraft[post.id] ?? ""}
                    onChange={(v) => setCommentDraft((prev) => ({ ...prev, [post.id]: v }))}
                    onSend={() => sendComment(post.id)}
                    placeholder="Kommentar…"
                  />
                </div>
              ) : null}
            </Panel>
          ))}
          <GhostButton className="w-full" onClick={() => load(true)}>
            Mehr laden
          </GhostButton>
        </div>
      )}
    </div>
  );
}

function readFileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read failed"));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("metadata failed"));
    video.src = URL.createObjectURL(file);
  });
}

function captureVideoFrame(file: File) {
  return new Promise<string>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas failed"));
        return;
      }
      ctx.drawImage(video, 0, 0);
      URL.revokeObjectURL(video.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    video.onerror = () => reject(new Error("frame failed"));
    video.src = URL.createObjectURL(file);
  });
}
