"use client";

import { motion } from "framer-motion";
import {
  Bell,
  Calendar,
  CheckSquare,
  Globe,
  Hash,
  Layout,
  MessageCircle,
  StickyNote,
  User,
  Users,
  UsersRound,
  X
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FeedTab } from "@/components/community/feed-tab";
import { FriendsTab } from "@/components/community/friends-tab";
import { GroupsTab } from "@/components/community/groups-tab";
import { ProfileTab } from "@/components/community/profile-tab";
import {
  BoardTab,
  CalendarTab,
  NotesTab,
  RemindersTab,
  TasksTab
} from "@/components/community/productivity-tabs";
import { RoomsTab } from "@/components/community/rooms-tab";
import { useReminderAlerts } from "@/hooks/use-reminder-alerts";
import type { CommunityTab } from "@/lib/community/types";

type CommunityHubProps = {
  userId: string;
};

const NAV: { id: CommunityTab | "reminders"; label: string; icon: typeof Globe; section?: string }[] = [
  { id: "feed", label: "Feed", icon: Globe, section: "Community" },
  { id: "rooms", label: "Chat-Räume", icon: Hash, section: "Community" },
  { id: "friends", label: "Freunde", icon: Users, section: "Community" },
  { id: "groups", label: "Gruppen + KI", icon: UsersRound, section: "Community" },
  { id: "profile", label: "Profil", icon: User, section: "Account" },
  { id: "tasks", label: "Tasks", icon: CheckSquare, section: "Produktivität" },
  { id: "calendar", label: "Kalender", icon: Calendar, section: "Produktivität" },
  { id: "reminders", label: "Reminder", icon: Bell, section: "Produktivität" },
  { id: "notes", label: "Notizen", icon: StickyNote, section: "Produktivität" },
  { id: "board", label: "Brainstorm", icon: Layout, section: "Produktivität" }
];

export function CommunityHub({ userId }: CommunityHubProps) {
  const [tab, setTab] = useState<CommunityTab | "reminders">("feed");
  const [navOpen, setNavOpen] = useState(false);
  const { alert, dismiss } = useReminderAlerts(true);

  const sections = ["Community", "Account", "Produktivität"];

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

  const navContent = (
    <nav className="space-y-4">
      {sections.map((section) => (
        <div key={section}>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted">{section}</p>
          <div className="space-y-1">
            {NAV.filter((n) => n.section === section).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setNavOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                    active ? "bg-primary text-white" : "hover:bg-white/10"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
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

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-primary">
            <MessageCircle size={16} /> Mekkz Community & Produktivität
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Social Hub</h1>
          <p className="mt-1 text-sm text-muted">
            Chat-Räume, Freunde, Feed, Tasks, Kalender, Notizen & Brainstorm — alles an einem Ort.
          </p>
        </div>
        <Link
          href="/chat"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          ← Zurück zum Chat
        </Link>
      </header>

      <div className="flex gap-4">
        <aside className="hidden w-56 shrink-0 lg:block">{navContent}</aside>

        {navOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Menü schließen"
              onClick={() => setNavOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-white/10 bg-card p-4">
              <div className="mb-4 flex justify-end">
                <button type="button" onClick={() => setNavOpen(false)} className="rounded-lg p-2 hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
              {navContent}
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              Menü
            </button>
            <span className="text-sm text-muted">{NAV.find((n) => n.id === tab)?.label}</span>
          </div>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </main>
      </div>

      <p className="text-center text-[10px] text-muted">User: {userId.slice(0, 8)}…</p>
    </div>
  );
}
