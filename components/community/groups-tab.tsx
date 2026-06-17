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
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <Panel>
          <FieldLabel>Neue Gruppe</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Gruppenname"
            />
            <PrimaryButton loading={sending} onClick={createGroup}>
              <Plus size={14} />
            </PrimaryButton>
          </div>
          <p className="mt-2 text-xs text-muted">
            Schreibe <code className="text-primary">@mekkz</code> oder <code className="text-primary">@ai</code>{" "}
            um die KI zu aktivieren.
          </p>
        </Panel>

        <Panel className="max-h-[50vh] overflow-y-auto">
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
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    activeGroup?.id === group.id ? "bg-primary/20" : "hover:bg-white/10"
                  }`}
                >
                  <UsersRound size={14} className="mr-1 inline" />
                  {group.name}
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="flex max-h-[70vh] flex-col">
        {!activeGroup ? (
          <EmptyState>Gruppe auswählen oder erstellen.</EmptyState>
        ) : (
          <>
            <h3 className="mb-3 border-b border-white/10 pb-3 font-semibold">{activeGroup.name}</h3>
            <ErrorBanner message={error} />
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  author={msg.isAi ? "Mekkz AI" : msg.authorName ?? "User"}
                  authorUserId={msg.isAi ? null : msg.userId}
                  authorTitle={msg.isAi ? undefined : msg.authorTitle}
                  authorVerified={msg.isAi ? undefined : msg.authorVerified}
                  authorCreator={msg.isAi ? undefined : msg.authorCreator}
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
