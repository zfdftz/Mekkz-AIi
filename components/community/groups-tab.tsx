"use client";

import { Plus, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ChatComposer,
  EmptyState,
  ErrorBanner,
  FieldLabel,
  GhostButton,
  LoadingState,
  MessageBubble,
  Panel,
  PrimaryButton,
  TextInput
} from "@/components/community/shared";
import { usePoll } from "@/hooks/use-poll";
import { readJsonResponse } from "@/lib/fetch-json";
import type { GroupChat, GroupMessage } from "@/lib/community/types";

export function GroupsTab() {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newName, setNewName] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/community/groups");
      const data = await readJsonResponse<{ groups?: GroupChat[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Gruppen konnten nicht geladen werden.");
      setGroups(data.groups ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (groupId: string) => {
    const res = await fetch(`/api/community/groups?groupId=${groupId}`);
    const data = await readJsonResponse<{ messages?: GroupMessage[] }>(res);
    if (res.ok) setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  usePoll(() => {
    if (activeGroup) return loadMessages(activeGroup.id);
  }, 3000, Boolean(activeGroup));

  async function createGroup() {
    if (!newName.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/community/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newName.trim() })
      });
      const data = await readJsonResponse<{ group?: GroupChat; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Erstellen fehlgeschlagen.");
      setNewName("");
      await loadGroups();
      if (data.group) {
        setActiveGroup(data.group);
        await loadMessages(data.group.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setSending(false);
    }
  }

  async function sendMessage() {
    if (!activeGroup || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/community/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          groupId: activeGroup.id,
          content: draft.trim()
        })
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Senden fehlgeschlagen.");
      setDraft("");
      await loadMessages(activeGroup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-3 lg:gap-5 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
      <div className={`space-y-3 lg:space-y-4 ${activeGroup ? "hidden xl:block" : "block"}`}>
        <Panel>
          <FieldLabel>Neue Gruppe</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Gruppenname"
            />
            <PrimaryButton loading={sending} onClick={createGroup}>
              <Plus size={16} />
            </PrimaryButton>
          </div>
          <p className="mt-2 text-sm text-muted">
            Schreibe <code className="text-primary">@mekkz</code> oder <code className="text-primary">@ai</code>{" "}
            um die KI zu aktivieren.
          </p>
        </Panel>

        <Panel className="max-h-[55vh] overflow-y-auto">
          <FieldLabel>Meine Gruppen</FieldLabel>
          {loading ? (
            <LoadingState />
          ) : groups.length === 0 ? (
            <EmptyState>Noch keine Gruppen.</EmptyState>
          ) : (
            <div className="space-y-1">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setActiveGroup(group);
                    void loadMessages(group.id);
                  }}
                  className={`w-full rounded-xl px-4 py-3 text-left text-base transition ${
                    activeGroup?.id === group.id ? "bg-primary/20" : "hover:bg-white/10"
                  }`}
                >
                  <UsersRound size={16} className="mr-1.5 inline" />
                  {group.name}
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className={`flex min-h-[min(65dvh,560px)] max-h-none flex-col xl:max-h-[85vh] xl:min-h-[560px] ${activeGroup ? "flex" : "hidden xl:flex"}`}>
        {!activeGroup ? (
          <EmptyState>Gruppe auswählen oder erstellen.</EmptyState>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <button
                type="button"
                onClick={() => setActiveGroup(null)}
                className="inline-flex shrink-0 items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium xl:hidden"
              >
                ← Zurück
              </button>
              <h3 className="truncate text-xl font-semibold sm:text-2xl">{activeGroup.name}</h3>
            </div>
            <ErrorBanner message={error} />
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  author={msg.isAi ? "Mekkz AI" : msg.authorName ?? "User"}
                  authorUserId={msg.isAi ? null : msg.userId}
                  authorTitle={msg.isAi ? undefined : msg.authorTitle}
                  authorVerified={msg.isAi ? undefined : msg.authorVerified}
                  authorCreator={msg.isAi ? undefined : msg.authorCreator}
                  authorChosen={msg.isAi ? undefined : msg.authorChosen}
                  authorUltraCreator={msg.isAi ? undefined : msg.authorUltraCreator}
                  content={msg.content}
                  highlight={msg.isAi}
                  time={msg.createdAt}
                />
              ))}
            </div>
            <div className="mt-3">
              <ChatComposer
                value={draft}
                onChange={setDraft}
                onSend={sendMessage}
                placeholder="Nachricht… (@mekkz für KI)"
                loading={sending}
              />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
