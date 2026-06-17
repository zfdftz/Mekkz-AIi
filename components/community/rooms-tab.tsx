"use client";

import { Hash, Pin, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ChatComposer,
  ChatLayout,
  ChatMessageList,
  EmptyState,
  ErrorBanner,
  GhostButton,
  LoadingState,
  MessageBubble,
  Panel,
  SideListButton,
  TextInput
} from "@/components/community/shared";
import { usePoll } from "@/hooks/use-poll";
import { readJsonResponse } from "@/lib/fetch-json";
import { PUBLIC_ROOM_MESSAGE_COOLDOWN_MS } from "@/lib/community/social";
import { chatMessagesScrollKey } from "@/lib/chat-user-color";
import type { ChatRoom, RoomMessage } from "@/lib/community/types";

export function RoomsTab() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [search, setSearch] = useState("");
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds > 0]);

  const loadRooms = useCallback(async () => {
    setError(null);
    try {
      const params = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/community/rooms${params}`);
      const data = await readJsonResponse<{ rooms?: ChatRoom[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Räume konnten nicht geladen werden.");
      setRooms(data.rooms ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadMessages = useCallback(async (roomId: string) => {
    const res = await fetch(`/api/community/rooms?roomId=${roomId}`);
    const data = await readJsonResponse<{
      messages?: RoomMessage[];
      messageCooldownSeconds?: number;
    }>(res);
    if (res.ok) {
      setMessages(data.messages ?? []);
      if (typeof data.messageCooldownSeconds === "number" && data.messageCooldownSeconds > 0) {
        setCooldownSeconds(data.messageCooldownSeconds);
      }
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  usePoll(() => {
    if (activeRoom) return loadMessages(activeRoom.id);
  }, 2000, Boolean(activeRoom));

  async function joinRoom(room: ChatRoom) {
    setError(null);
    setCooldownSeconds(0);
    const res = await fetch("/api/community/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", roomId: room.id })
    });
    const data = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      setError(data.error || "Beitreten fehlgeschlagen.");
      return;
    }
    setActiveRoom(room);
    await loadMessages(room.id);
  }

  async function leaveRoom() {
    if (!activeRoom) return;
    await fetch("/api/community/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "leave", roomId: activeRoom.id })
    });
    setActiveRoom(null);
    setMessages([]);
    setCooldownSeconds(0);
  }

  async function sendMessage() {
    if (!activeRoom || !draft.trim() || cooldownSeconds > 0 || sending) return;
    const content = draft.trim();
    setDraft("");
    setSending(true);
    try {
      const res = await fetch("/api/community/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", roomId: activeRoom.id, content })
      });
      const data = await readJsonResponse<{
        error?: string;
        retryAfterSeconds?: number;
        message?: RoomMessage;
      }>(res);
      if (!res.ok) {
        setDraft(content);
        if (typeof data.retryAfterSeconds === "number" && data.retryAfterSeconds > 0) {
          setCooldownSeconds(data.retryAfterSeconds);
        }
        throw new Error(data.error || "Senden fehlgeschlagen.");
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      setCooldownSeconds(Math.ceil(PUBLIC_ROOM_MESSAGE_COOLDOWN_MS / 1000));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setSending(false);
    }
  }

  const pinned = activeRoom?.pinnedMessageId
    ? messages.find((m) => m.id === activeRoom.pinnedMessageId)
    : null;

  return (
    <ChatLayout
      mobileView={activeRoom ? "main" : "sidebar"}
      sidebarTitle="Themen-Räume"
      sidebar={
        <>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Räume suchen…"
            />
          </div>
          {loading ? (
            <LoadingState />
          ) : rooms.length === 0 ? (
            <EmptyState>Keine Räume gefunden.</EmptyState>
          ) : (
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {rooms.map((room) => (
                <SideListButton
                  key={room.id}
                  active={activeRoom?.id === room.id}
                  onClick={() => joinRoom(room)}
                  title={room.name}
                  subtitle={room.topic}
                  leading={
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Hash size={16} />
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </>
      }
      main={
        !activeRoom ? (
          <EmptyState>Wähle einen Chat-Raum aus der Liste.</EmptyState>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-2 border-b border-white/10 pb-4">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => void leaveRoom()}
                  className="mb-2 inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium xl:hidden"
                >
                  ← Zurück
                </button>
                <h3 className="truncate text-xl font-semibold sm:text-2xl">{activeRoom.name}</h3>
                <p className="text-base text-muted sm:text-lg">{activeRoom.description}</p>
              </div>
              <GhostButton className="hidden shrink-0 xl:inline-flex" onClick={leaveRoom}>
                Verlassen
              </GhostButton>
            </div>
            {activeRoom.rules ? (
              <details className="mb-4 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm">
                <summary className="cursor-pointer font-medium">Raumregeln</summary>
                <p className="mt-2 whitespace-pre-wrap text-muted">{activeRoom.rules}</p>
              </details>
            ) : null}
            {pinned ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-base">
                <Pin size={16} className="mt-0.5 shrink-0 text-amber-300" />
                <span>{pinned.content}</span>
              </div>
            ) : null}
            <ErrorBanner message={error} />
            <ChatMessageList scrollKey={chatMessagesScrollKey(messages)}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  author={msg.authorName ?? "User"}
                  authorUserId={msg.userId}
                  authorTitle={msg.authorTitle}
                  authorVerified={msg.authorVerified}
                  authorCreator={msg.authorCreator}
                  authorChosen={msg.authorChosen}
                  authorUltraCreator={msg.authorUltraCreator}
                  authorAvatarUrl={msg.authorAvatarUrl}
                  colorKey={msg.userId}
                  content={msg.content}
                  time={msg.createdAt}
                />
              ))}
            </ChatMessageList>
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSend={sendMessage}
              placeholder={`Nachricht in ${activeRoom.name}…`}
              loading={sending}
              disabled={cooldownSeconds > 0}
              sendLabel={cooldownSeconds > 0 ? `${cooldownSeconds}s` : "Senden"}
            />
          </>
        )
      }
    />
  );
}
