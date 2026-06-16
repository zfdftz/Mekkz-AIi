"use client";

import { UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ChatComposer,
  EmptyState,
  ErrorBanner,
  FieldLabel,
  GhostButton,
  LoadingState,
  MessageBubble,
  OnlineDot,
  Panel,
  PrimaryButton,
  TextInput
} from "@/components/community/shared";
import { usePoll } from "@/hooks/use-poll";
import { readJsonResponse } from "@/lib/fetch-json";
import type { FriendMessage, FriendRequest } from "@/lib/community/types";

type FriendRow = {
  userId: string;
  username: string;
  isOnline?: boolean;
  lastSeenAt?: string | null;
};

export function FriendsTab() {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [activeFriend, setActiveFriend] = useState<FriendRow | null>(null);
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [username, setUsername] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/community/friends");
      const data = await readJsonResponse<{
        friends?: FriendRow[];
        requests?: FriendRequest[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Freunde konnten nicht geladen werden.");
      setFriends(data.friends ?? []);
      setRequests(data.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (friendId: string) => {
    const res = await fetch(`/api/community/friends?friendId=${friendId}`);
    const data = await readJsonResponse<{ messages?: FriendMessage[] }>(res);
    if (res.ok) setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  usePoll(() => {
    if (activeFriend) return loadMessages(activeFriend.userId);
  }, 3000, Boolean(activeFriend));

  async function sendRequest() {
    if (!username.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", username: username.trim() })
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Anfrage fehlgeschlagen.");
      setUsername("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setSending(false);
    }
  }

  async function respond(requestId: string, accept: boolean) {
    await fetch("/api/community/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", requestId, accept })
    });
    await load();
  }

  async function sendMessage() {
    if (!activeFriend || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          friendId: activeFriend.userId,
          content: draft.trim()
        })
      });
      if (!res.ok) return;
      setDraft("");
      await loadMessages(activeFriend.userId);
    } finally {
      setSending(false);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <Panel>
          <FieldLabel>Freund hinzufügen</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Benutzername"
            />
            <PrimaryButton loading={sending} onClick={sendRequest}>
              <UserPlus size={14} />
            </PrimaryButton>
          </div>
        </Panel>

        {pending.length > 0 ? (
          <Panel>
            <FieldLabel>Anfragen</FieldLabel>
            <div className="space-y-2">
              {pending.map((req) => (
                <div key={req.id} className="rounded-xl bg-black/20 px-3 py-2 text-sm">
                  <p>{req.fromUsername ?? "User"}</p>
                  <div className="mt-2 flex gap-2">
                    <PrimaryButton className="flex-1" onClick={() => respond(req.id, true)}>
                      Annehmen
                    </PrimaryButton>
                    <GhostButton className="flex-1" onClick={() => respond(req.id, false)}>
                      Ablehnen
                    </GhostButton>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel className="max-h-[40vh] overflow-y-auto">
          <FieldLabel>Freunde</FieldLabel>
          {loading ? (
            <LoadingState />
          ) : friends.length === 0 ? (
            <EmptyState>Noch keine Freunde.</EmptyState>
          ) : (
            <div className="space-y-1">
              {friends.map((friend) => (
                <button
                  key={friend.userId}
                  type="button"
                  onClick={() => {
                    setActiveFriend(friend);
                    void loadMessages(friend.userId);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    activeFriend?.userId === friend.userId ? "bg-primary/20" : "hover:bg-white/10"
                  }`}
                >
                  <OnlineDot online={friend.isOnline} />
                  <span className="font-medium">{friend.username}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="flex max-h-[70vh] flex-col">
        {!activeFriend ? (
          <EmptyState>
            <Users size={24} className="mx-auto mb-2 opacity-50" />
            Wähle einen Freund für den privaten Chat.
          </EmptyState>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
              <OnlineDot online={activeFriend.isOnline} />
              <div>
                <h3 className="font-semibold">{activeFriend.username}</h3>
                <p className="text-xs text-muted">
                  {activeFriend.isOnline
                    ? "Online"
                    : activeFriend.lastSeenAt
                      ? `Zuletzt: ${new Date(activeFriend.lastSeenAt).toLocaleString()}`
                      : "Offline"}
                </p>
              </div>
            </div>
            <ErrorBanner message={error} />
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  author={msg.senderId === activeFriend.userId ? activeFriend.username : "Du"}
                  content={msg.content}
                  time={msg.createdAt}
                />
              ))}
            </div>
            <div className="mt-3">
              <ChatComposer
                value={draft}
                onChange={setDraft}
                onSend={sendMessage}
                placeholder="Private Nachricht…"
                loading={sending}
              />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
