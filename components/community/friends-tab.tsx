"use client";

import { UserPlus, Users, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProfileLink } from "@/components/community/profile-context";
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

type RequestResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  message?: string;
  status?: string;
  targetUsername?: string;
};

export function FriendsTab() {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoingPending, setOutgoingPending] = useState<FriendRequest[]>([]);
  const [activeFriend, setActiveFriend] = useState<FriendRow | null>(null);
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [username, setUsername] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/community/friends");
      const data = await readJsonResponse<{
        friends?: FriendRow[];
        incoming?: FriendRequest[];
        outgoingPending?: FriendRequest[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Freunde konnten nicht geladen werden.");
      setFriends(data.friends ?? []);
      setIncoming(data.incoming ?? []);
      setOutgoingPending(data.outgoingPending ?? []);
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
    void load();
  }, 8000, true);

  usePoll(() => {
    if (activeFriend) return loadMessages(activeFriend.userId);
  }, 3000, Boolean(activeFriend));

  async function sendRequest() {
    const name = username.trim();
    if (name.length < 3) {
      setError("Benutzername: mindestens 3 Zeichen.");
      setFeedback(null);
      return;
    }
    setSending(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", username: name })
      });
      const data = await readJsonResponse<RequestResponse>(res);
      if (!res.ok) {
        if (data.code === "USER_NOT_FOUND" || res.status === 404) {
          setError("User not found.");
        } else {
          setError(data.error || "Anfrage fehlgeschlagen.");
        }
        return;
      }
      setUsername("");
      setFeedback(data.message ?? "Freundschaftsanfrage gesendet.");
      if (data.status === "mutual_accepted" && data.targetUsername) {
        setFeedback(`Ihr seid jetzt Freunde mit @${data.targetUsername}!`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setSending(false);
    }
  }

  async function respond(requestId: string, accept: boolean) {
    setFeedback(null);
    const res = await fetch("/api/community/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "respond", requestId, accept })
    });
    const data = await readJsonResponse<RequestResponse>(res);
    if (res.ok) {
      setFeedback(data.message ?? (accept ? "Freundschaft angenommen." : "Anfrage abgelehnt."));
    }
    await load();
  }

  async function addBack(req: FriendRequest) {
    setUsername(req.fromUsername ?? req.profile?.username ?? "");
    await respond(req.id, true);
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

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel>
          <FieldLabel>Freund hinzufügen</FieldLabel>
          <p className="mb-2 text-sm text-muted">
            Aktuellen Benutzernamen eingeben — jeder Name ist einmalig. Nach einer Namensänderung den
            neuen Namen verwenden.
          </p>
          <div className="flex gap-2">
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. max-mustermann"
              minLength={3}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendRequest();
              }}
            />
            <PrimaryButton loading={sending} onClick={sendRequest} aria-label="Freund hinzufügen">
              <UserPlus size={18} />
            </PrimaryButton>
          </div>
          {feedback ? (
            <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-base text-emerald-200">
              {feedback}
            </p>
          ) : null}
          <ErrorBanner message={error} />
        </Panel>

        {incoming.length > 0 ? (
          <Panel>
            <FieldLabel>Hat dich hinzugefügt</FieldLabel>
            <div className="space-y-3">
              {incoming.map((req) => (
                <IncomingCard key={req.id} request={req} onAccept={() => addBack(req)} onDecline={() => respond(req.id, false)} />
              ))}
            </div>
          </Panel>
        ) : null}

        {outgoingPending.length > 0 ? (
          <Panel>
            <FieldLabel>Ausstehend</FieldLabel>
            <div className="space-y-2">
              {outgoingPending.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-base"
                >
                  <span>@{req.toUsername ?? "user"}</span>
                  <span className="text-sm text-muted">Anfrage gesendet</span>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel className="max-h-[40vh] overflow-y-auto">
          <FieldLabel>Freunde ({friends.length})</FieldLabel>
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
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base transition ${
                    activeFriend?.userId === friend.userId ? "community-nav-active" : "hover:bg-white/8"
                  }`}
                >
                  <OnlineDot online={friend.isOnline} />
                  <span className="font-medium">@{friend.username}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="flex min-h-[560px] max-h-[85vh] flex-col">
        {!activeFriend ? (
          <EmptyState>
            <Users size={32} className="mb-2 opacity-40" />
            Wähle einen Freund für den privaten Chat — oder nimm eine Anfrage oben an.
          </EmptyState>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <FriendAvatar
                username={activeFriend.username}
                avatarUrl={null}
                size="md"
              />
              <div>
                <ProfileLink userId={activeFriend.userId} className="text-xl font-semibold">
                  @{activeFriend.username}
                </ProfileLink>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <OnlineDot online={activeFriend.isOnline} />
                  {activeFriend.isOnline
                    ? "Online"
                    : activeFriend.lastSeenAt
                      ? `Zuletzt: ${new Date(activeFriend.lastSeenAt).toLocaleString()}`
                      : "Offline"}
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.map((msg) => {
                const isFriend = msg.senderId === activeFriend.userId;
                return (
                  <MessageBubble
                    key={msg.id}
                    author={isFriend ? activeFriend.username ?? "user" : "Du"}
                    authorUserId={isFriend ? activeFriend.userId : undefined}
                    authorTitle={isFriend ? msg.authorTitle : undefined}
                    authorVerified={isFriend ? msg.authorVerified : undefined}
                    authorCreator={isFriend ? msg.authorCreator : undefined}
                    authorChosen={isFriend ? msg.authorChosen : undefined}
                    authorUltraCreator={isFriend ? msg.authorUltraCreator : undefined}
                    content={msg.content}
                    time={msg.createdAt}
                  />
                );
              })}
            </div>
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSend={sendMessage}
              placeholder="Private Nachricht…"
              loading={sending}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

function FriendAvatar({
  username,
  avatarUrl,
  size = "sm"
}: {
  username: string;
  avatarUrl: string | null | undefined;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-14 w-14 text-xl" : "h-11 w-11 text-lg";
  return (
    <div
      className={`${dim} shrink-0 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-primary/40 to-primary/10`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-bold text-primary">
          {(username || "U")[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

function IncomingCard({
  request,
  onAccept,
  onDecline
}: {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const name = request.profile?.username ?? request.fromUsername ?? "user";
  const bio = request.profile?.bio?.trim();

  return (
    <div className="flex gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 to-transparent p-4">
      <FriendAvatar username={name} avatarUrl={request.profile?.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">Hat dich hinzugefügt</p>
        <p className="truncate text-lg font-semibold">@{name}</p>
        {bio ? <p className="mt-1 line-clamp-2 text-sm text-muted">{bio}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
          {request.profile?.isOnline ? <span className="text-emerald-400">● Online</span> : null}
          {request.profile?.postsCount != null ? <span>{request.profile.postsCount} Posts</span> : null}
        </div>
        <div className="mt-3 flex gap-2">
          <PrimaryButton className="flex-1 !py-2.5 text-sm" onClick={onAccept}>
            <UserCheck size={16} className="mr-1.5 inline" /> Hinzufügen
          </PrimaryButton>
          <GhostButton className="flex-1 !py-2.5 text-sm" onClick={onDecline}>
            Ignorieren
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
