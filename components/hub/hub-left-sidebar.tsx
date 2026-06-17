"use client";

import {
  Bot,
  FolderKanban,
  LayoutGrid,
  MessageSquarePlus,
  Pin,
  Sparkles,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HubGlobalSearch } from "@/components/hub/hub-global-search";
import { readJsonResponse } from "@/lib/fetch-json";
import type { Conversation } from "@/lib/types";
import type { HubProject, HubWorkspace } from "@/lib/hub/types";

type LeftSidebarProps = {
  userId: string;
  activeConversationId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
};

export function HubLeftSidebar({
  userId,
  activeConversationId,
  onSelectChat,
  onNewChat
}: LeftSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<HubWorkspace[]>([]);
  const [projects, setProjects] = useState<HubProject[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [convRes, pinRes, hubRes] = await Promise.all([
      fetch(`/api/conversations?userId=${userId}`),
      fetch("/api/hub/pinned-chats"),
      fetch("/api/hub/workspaces?projects=1")
    ]);
    const convData = await readJsonResponse<{ conversations?: Conversation[] }>(convRes);
    const pinData = await readJsonResponse<{ pinned?: string[] }>(pinRes);
    const hubData = await readJsonResponse<{ workspaces?: HubWorkspace[]; projects?: HubProject[] }>(
      hubRes
    );
    if (convRes.ok) setConversations(convData.conversations ?? []);
    if (pinRes.ok) setPinned(pinData.pinned ?? []);
    if (hubRes.ok) {
      setWorkspaces(hubData.workspaces ?? []);
      setProjects(hubData.projects ?? []);
      if (!activeWorkspaceId && hubData.workspaces?.[0]) {
        setActiveWorkspaceId(hubData.workspaces[0].id);
      }
    }
  }, [userId, activeWorkspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pinnedChats = useMemo(
    () => conversations.filter((c) => pinned.includes(c.id)),
    [conversations, pinned]
  );
  const otherChats = useMemo(
    () => conversations.filter((c) => !pinned.includes(c.id)),
    [conversations, pinned]
  );
  const workspaceProjects = useMemo(
    () => projects.filter((p) => !activeWorkspaceId || p.workspaceId === activeWorkspaceId),
    [projects, activeWorkspaceId]
  );

  async function togglePin(conversationId: string) {
    const isPinned = pinned.includes(conversationId);
    await fetch("/api/hub/pinned-chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, pinned: !isPinned })
    });
    void load();
  }

  async function createWorkspace() {
    const name = window.prompt("Workspace-Name?");
    if (!name?.trim()) return;
    await fetch("/api/hub/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: name.trim(), workspaceType: "team" })
    });
    void load();
  }

  async function createProject() {
    if (!activeWorkspaceId) return;
    const name = window.prompt("Projekt-Name?");
    if (!name?.trim()) return;
    await fetch("/api/hub/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", workspaceId: activeWorkspaceId, name: name.trim() })
    });
    void load();
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-3">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-primary" />
        <div>
          <p className="text-sm font-bold">Mekkz Hub</p>
          <p className="text-[10px] text-muted">Workspace & Chats</p>
        </div>
      </div>

      <HubGlobalSearch />

      <button
        type="button"
        onClick={onNewChat}
        className="btn-primary mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
      >
        <MessageSquarePlus size={16} /> Neuer Chat
      </button>

      <Section title="Angepinnt" icon={Pin}>
        {pinnedChats.length === 0 ? (
          <p className="px-2 text-xs text-muted">Keine angepinnten Chats</p>
        ) : (
          pinnedChats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              active={chat.id === activeConversationId}
              pinned
              onSelect={() => onSelectChat(chat.id)}
              onTogglePin={() => togglePin(chat.id)}
            />
          ))
        )}
      </Section>

      <Section title="Chats" icon={Bot}>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {otherChats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              active={chat.id === activeConversationId}
              onSelect={() => onSelectChat(chat.id)}
              onTogglePin={() => togglePin(chat.id)}
            />
          ))}
        </div>
      </Section>

      <Section title="Workspaces" icon={LayoutGrid}>
        <div className="space-y-1">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                activeWorkspaceId === ws.id ? "bg-primary/20 text-primary" : "hover:bg-white/8"
              }`}
            >
              {ws.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void createWorkspace()}
            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted hover:bg-white/8"
          >
            + Workspace
          </button>
        </div>
      </Section>

      <Section title="Projekte" icon={FolderKanban}>
        <div className="space-y-1">
          {workspaceProjects.slice(0, 8).map((p) => (
            <div key={p.id} className="rounded-lg px-2 py-1.5 text-xs hover:bg-white/8">
              {p.name}
            </div>
          ))}
          <button
            type="button"
            onClick={() => void createProject()}
            className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted hover:bg-white/8"
          >
            + Projekt
          </button>
        </div>
      </Section>

      <Link
        href="/tools"
        className="mt-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium hover:bg-white/10"
      >
        <Wrench size={14} /> AI Tools & Agents
      </Link>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: typeof Pin;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 min-h-0 shrink-0">
      <p className="mb-1 flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-wide text-muted">
        <Icon size={12} /> {title}
      </p>
      {children}
    </div>
  );
}

function ChatRow({
  chat,
  active,
  pinned,
  onSelect,
  onTogglePin
}: {
  chat: Conversation;
  active: boolean;
  pinned?: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${
        active ? "bg-primary/20 text-primary" : "hover:bg-white/8"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-xs">
        {chat.title || "Neuer Chat"}
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        className={`rounded p-1 opacity-0 transition group-hover:opacity-100 ${
          pinned ? "text-primary opacity-100" : "text-muted"
        }`}
        aria-label={pinned ? "Loslösen" : "Anpinnen"}
      >
        <Pin size={12} />
      </button>
    </div>
  );
}
