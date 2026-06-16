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
  PrimaryButton,
  TextArea
} from "@/components/community/shared";
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
    if (!content.trim()) return;
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
        body: JSON.stringify({ action: "post", content, postType, tags })
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Post fehlgeschlagen.");
      setContent("");
      setTagsInput("");
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setPosting(false);
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <GhostButton
          className={!trending ? "border-primary/40 bg-primary/15" : ""}
          onClick={() => setTrending(false)}
        >
          Neueste
        </GhostButton>
        <GhostButton
          className={trending ? "border-primary/40 bg-primary/15" : ""}
          onClick={() => setTrending(true)}
        >
          <TrendingUp size={14} className="mr-1 inline" /> Trending
        </GhostButton>
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Tag filtern…"
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
        />
      </div>

      <Panel>
        <FieldLabel>Neuer Post</FieldLabel>
        <div className="mb-2 flex flex-wrap gap-2">
          {(["text", "prompt", "story", "ai_output", "result"] as const).map((type) => (
            <GhostButton
              key={type}
              className={postType === type ? "border-primary/40 bg-primary/15" : ""}
              onClick={() => setPostType(type)}
            >
              {type}
            </GhostButton>
          ))}
        </div>
        <TextArea rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Was möchtest du teilen?" />
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags (kommagetrennt)"
            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
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
        <div className="space-y-3">
          {posts.map((post) => (
            <Panel key={post.id} className="animate-in fade-in">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{post.authorName ?? "User"}</span>
                  <span className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase">
                    {post.postType}
                  </span>
                </div>
                <span className="text-xs text-muted">{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{post.content}</p>
              {post.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {post.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                <GhostButton onClick={() => toggleLike(post.id)}>
                  <Heart size={14} className={`mr-1 inline ${post.likedByMe ? "fill-red-400 text-red-400" : ""}`} />
                  {post.likesCount}
                </GhostButton>
                <GhostButton onClick={() => loadComments(post.id)}>
                  <MessageCircle size={14} className="mr-1 inline" />
                  {post.commentsCount}
                </GhostButton>
                <GhostButton onClick={() => repostPost(post.id)}>
                  <Repeat2 size={14} className="mr-1 inline" />
                  {post.repostsCount}
                </GhostButton>
              </div>
              {expanded === post.id ? (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {(comments[post.id] ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg bg-black/20 px-3 py-2 text-sm">
                      <span className="font-medium text-primary">{c.authorName}</span>: {c.content}
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
