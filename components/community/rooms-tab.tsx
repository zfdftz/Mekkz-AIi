"use client";

import { Hash, Pin, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ChatComposer,
  EmptyState,
  ErrorBanner,
  GhostButton,
  LoadingState,
  MessageBubble,
  Panel,
  PrimaryButton,
  TextInput
} from "@/components/community/shared";
import { usePoll } from "@/hooks/use-poll";
import { readJsonResponse } from "@/lib/fetch-json";
import type { ChatRoom, RoomMessage } from "@/lib/community/types";

export function RoomsTab() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [search, setSearch] = useState("");
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const data = await readJsonResponse<{ messages?: RoomMessage[] }>(res);
    if (res.ok) setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  usePoll(() => {
    if (activeRoom) return loadMessages(activeRoom.id);
  }, 3000, Boolean(activeRoom));

  async function joinRoom(room: ChatRoom) {
    setError(null);
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
  }

  async function sendMessage() {
    if (!activeRoom || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/community/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", roomId: activeRoom.id, content: draft.trim() })
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Senden fehlgeschlagen.");
      setDraft("");
      await loadMessages(activeRoom.id);
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
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Panel className="flex max-h-[70vh] flex-col">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <TextInput
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Räume suchen…"
          />
        </div>
        {loading ? (
          <LoadingState />
        ) : rooms.length === 0 ? (
          <EmptyState>Keine Räume — Migration in Supabase ausführen?</EmptyState>
        ) : (
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => joinRoom(room)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  activeRoom?.id === room.id ? "bg-primary/20 text-primary" : "hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Hash size={14} />
                  {room.name}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{room.topic}</p>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="flex max-h-[70vh] flex-col">
        {!activeRoom ? (
          <EmptyState>Wähle einen Chat-Raum links aus.</EmptyState>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-semibold">{activeRoom.name}</h3>
                <p className="text-xs text-muted">{activeRoom.description}</p>
              </div>
              <GhostButton onClick={leaveRoom}>Verlassen</GhostButton>
            </div>
            {activeRoom.rules ? (
              <details className="mb-3 rounded-xl bg-black/20 px-3 py-2 text-xs">
                <summary className="cursor-pointer font-medium">Raumregeln</summary>
                <p className="mt-2 whitespace-pre-wrap text-muted">{activeRoom.rules}</p>
              </details>
            ) : null}
            {pinned ? (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                <Pin size={14} className="mt-0.5 shrink-0 text-amber-300" />
                <span>{pinned.content}</span>
              </div>
            ) : null}
            <ErrorBanner message={error} />
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  author={msg.authorName ?? "User"}
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
                placeholder={`Nachricht in ${activeRoom.name}…`}
                loading={sending}
              />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
