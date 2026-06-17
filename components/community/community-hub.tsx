"use client";

import { motion } from "framer-motion";
import {
  Bell,
  Calendar,
  CheckSquare,
  Globe,
  Hash,
  Layout,
  Menu,
  MessageCircle,
  Sparkles,
  StickyNote,
  User,
  Users,
  UsersRound,
  X
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { FeedTab } from "@/components/community/feed-tab";
import { LoadingState } from "@/components/community/shared";
import { ProfileProvider } from "@/components/community/profile-context";
import { RewardsAdminButton } from "@/components/rewards/rewards-admin-button";
import { useReminderAlerts } from "@/hooks/use-reminder-alerts";
import type { CommunityTab } from "@/lib/community/types";

const RoomsTab = dynamic(
  () => import("@/components/community/rooms-tab").then((m) => ({ default: m.RoomsTab })),
  { loading: () => <LoadingState /> }
);
const FriendsTab = dynamic(
  () => import("@/components/community/friends-tab").then((m) => ({ default: m.FriendsTab })),
  { loading: () => <LoadingState /> }
);
const GroupsTab = dynamic(
  () => import("@/components/community/groups-tab").then((m) => ({ default: m.GroupsTab })),
  { loading: () => <LoadingState /> }
);
const ProfileTab = dynamic(
  () => import("@/components/community/profile-tab").then((m) => ({ default: m.ProfileTab })),
  { loading: () => <LoadingState /> }
);
const TasksTab = dynamic(
  () =>
    import("@/components/community/productivity-tabs").then((m) => ({ default: m.TasksTab })),
  { loading: () => <LoadingState /> }
);
const CalendarTab = dynamic(
  () =>
    import("@/components/community/productivity-tabs").then((m) => ({ default: m.CalendarTab })),
  { loading: () => <LoadingState /> }
);
const RemindersTab = dynamic(
  () =>
    import("@/components/community/productivity-tabs").then((m) => ({ default: m.RemindersTab })),
  { loading: () => <LoadingState /> }
);
const NotesTab = dynamic(
  () =>
    import("@/components/community/productivity-tabs").then((m) => ({ default: m.NotesTab })),
  { loading: () => <LoadingState /> }
);
const BoardTab = dynamic(
  () => import("@/components/community/board-tab").then((m) => ({ default: m.BoardTab })),
  { loading: () => <LoadingState /> }
);

type TabId = CommunityTab | "reminders";

const NAV: {
  id: TabId;
  label: string;
  description: string;
  icon: typeof Globe;
  section: "community" | "account" | "productivity";
}[] = [
  { id: "feed", label: "Feed", description: "Posts, Trends & Tags", icon: Globe, section: "community" },
  { id: "rooms", label: "Räume", description: "Öffentliche Topic-Chats", icon: Hash, section: "community" },
  { id: "friends", label: "Freunde", description: "Anfragen & 1:1 Chat", icon: Users, section: "community" },
  { id: "groups", label: "Gruppen", description: "Team-Chats mit @mekkz", icon: UsersRound, section: "community" },
  { id: "profile", label: "Profil", description: "Avatar, Bio & Stats", icon: User, section: "account" },
  { id: "tasks", label: "Tasks", description: "Kanban & KI-To-dos", icon: CheckSquare, section: "productivity" },
  { id: "calendar", label: "Kalender", description: "Termine & Events", icon: Calendar, section: "productivity" },
  { id: "reminders", label: "Reminder", description: "Erinnerungen & Alerts", icon: Bell, section: "productivity" },
  { id: "notes", label: "Notizen", description: "Suchen & KI-Summary", icon: StickyNote, section: "productivity" },
  { id: "board", label: "Brainstorm", description: "Canvas & Sticky Notes", icon: Layout, section: "productivity" }
];

const SECTIONS = [
  { key: "community" as const, label: "Community" },
  { key: "account" as const, label: "Account" },
  { key: "productivity" as const, label: "Produktivität" }
];

export function CommunityHub({ userId: _userId }: { userId: string }) {
  const [tab, setTab] = useState<TabId>("feed");
  const [navOpen, setNavOpen] = useState(false);
  const { alert, dismiss } = useReminderAlerts(true);

  const active = NAV.find((n) => n.id === tab)!;

  function renderTab() {
    switch (tab) {
      case "feed":
        return <FeedTab />;
      case "rooms":
        return <RoomsTab />;
      case "friends":
        return <FriendsTab />;
      case "groups":
        return <GroupsTab />;
      case "profile":
        return <ProfileTab />;
      case "tasks":
        return <TasksTab />;
      case "calendar":
        return <CalendarTab />;
      case "reminders":
        return <RemindersTab />;
      case "notes":
        return <NotesTab />;
      case "board":
        return <BoardTab />;
      default:
        return <FeedTab />;
    }
  }

  const navButtons = (
    <nav className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section.key}>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            {section.label}
          </p>
          <div className="space-y-1">
            {NAV.filter((n) => n.section === section.key).map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setNavOpen(false);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isActive
                      ? "community-nav-active shadow-lg shadow-primary/15"
                      : "hover:bg-white/8"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-primary/30 text-white" : "bg-white/8 text-muted group-hover:text-fg"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block truncate text-[11px] text-muted">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <ProfileProvider>
    <RewardsAdminButton />
    <div className="community-hub mx-auto min-h-screen max-w-[1400px] px-4 py-5 sm:px-6 sm:py-8">
      {alert ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-lg items-start justify-between gap-3 rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-xl backdrop-blur-md sm:left-auto sm:right-6"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Bell size={16} /> Reminder
            </p>
            <p className="mt-1 text-sm">{alert.title}</p>
            <p className="text-xs text-muted">{new Date(alert.remindAt).toLocaleString()}</p>
          </div>
          <button type="button" onClick={dismiss} className="rounded-lg p-1 hover:bg-white/10">
            <X size={16} />
          </button>
        </motion.div>
      ) : null}

      <header className="community-header mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-primary/15 via-white/5 to-transparent p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles size={12} /> Mekkz Hub
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Community & Produktivität</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Alles an einem Ort — chatten, connecten, planen und brainstormen.
            </p>
          </div>
          <Link
            href="/chat"
            prefetch
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/15"
          >
            ← Zurück zum Chat
          </Link>
        </div>
      </header>

      <div className="flex gap-5 lg:gap-6">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <div className="community-sidebar sticky top-6 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
            {navButtons}
          </div>
        </aside>

        {navOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-label="Menü schließen"
              onClick={() => setNavOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[min(100vw-3rem,320px)] overflow-y-auto border-r border-white/10 bg-card/95 p-4 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Navigation</span>
                <button type="button" onClick={() => setNavOpen(false)} className="rounded-lg p-2 hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>
              {navButtons}
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm lg:hidden"
            >
              <Menu size={16} /> Menü
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <active.icon size={20} />
              </span>
              <div>
                <h2 className="text-lg font-semibold">{active.label}</h2>
                <p className="text-xs text-muted">{active.description}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-2 lg:hidden">
            <div className="flex min-w-max gap-2">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    tab === item.id ? "bg-primary text-white" : "bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="community-content rounded-2xl"
          >
            {renderTab()}
          </motion.div>
        </main>
      </div>
    </div>
    </ProfileProvider>
  );
}
