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
  Shield,
  Sparkles,
  StickyNote,
  User,
  Users,
  UsersRound,
  X
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n/messages";
import { FeedTab } from "@/components/community/feed-tab";
import { LoadingState } from "@/components/community/shared";
import { ProfileProvider } from "@/components/community/profile-context";
import { RewardsAdminButton } from "@/components/rewards/rewards-admin-button";
import { getSeasonUiClass } from "@/lib/rewards/season-theme";
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
const ClansTab = dynamic(
  () => import("@/components/community/clans-tab").then((m) => ({ default: m.ClansTab })),
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

const CLANS_DISABLED = true;

type TabId = CommunityTab | "reminders";

type NavItem = {
  id: TabId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: typeof Globe;
  section: "community" | "account" | "productivity";
  disabled?: boolean;
  disabledBadgeKey?: TranslationKey;
};

const NAV: NavItem[] = [
  {
    id: "feed",
    labelKey: "community.navFeed",
    descriptionKey: "community.navFeedDesc",
    icon: Globe,
    section: "community"
  },
  {
    id: "rooms",
    labelKey: "community.navRooms",
    descriptionKey: "community.navRoomsDesc",
    icon: Hash,
    section: "community"
  },
  {
    id: "friends",
    labelKey: "community.navFriends",
    descriptionKey: "community.navFriendsDesc",
    icon: Users,
    section: "community"
  },
  {
    id: "groups",
    labelKey: "community.navGroups",
    descriptionKey: "community.navGroupsDesc",
    icon: UsersRound,
    section: "community"
  },
  {
    id: "clans",
    labelKey: "community.navClans",
    descriptionKey: "community.navClansDesc",
    icon: Shield,
    section: "community",
    disabled: CLANS_DISABLED,
    disabledBadgeKey: "community.onWork"
  },
  {
    id: "profile",
    labelKey: "community.navProfile",
    descriptionKey: "community.navProfileDesc",
    icon: User,
    section: "account"
  },
  {
    id: "tasks",
    labelKey: "community.navTasks",
    descriptionKey: "community.navTasksDesc",
    icon: CheckSquare,
    section: "productivity"
  },
  {
    id: "calendar",
    labelKey: "community.navCalendar",
    descriptionKey: "community.navCalendarDesc",
    icon: Calendar,
    section: "productivity"
  },
  {
    id: "reminders",
    labelKey: "community.navReminders",
    descriptionKey: "community.navRemindersDesc",
    icon: Bell,
    section: "productivity"
  },
  {
    id: "notes",
    labelKey: "community.navNotes",
    descriptionKey: "community.navNotesDesc",
    icon: StickyNote,
    section: "productivity"
  },
  {
    id: "board",
    labelKey: "community.navBoard",
    descriptionKey: "community.navBoardDesc",
    icon: Layout,
    section: "productivity"
  }
];

const SECTIONS: {
  key: NavItem["section"];
  labelKey: TranslationKey;
}[] = [
  { key: "community", labelKey: "community.sectionCommunity" },
  { key: "account", labelKey: "community.sectionAccount" },
  { key: "productivity", labelKey: "community.sectionProductivity" }
];

export function CommunityHub({ userId: _userId }: { userId: string }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<TabId>("feed");
  const [navOpen, setNavOpen] = useState(false);
  const { alert, dismiss } = useReminderAlerts(true);
  const seasonClass = getSeasonUiClass();

  const active = NAV.find((n) => n.id === tab)!;
  const activeLabel = t(active.labelKey);
  const activeDescription = t(active.descriptionKey);

  const navItems = useMemo(
    () =>
      NAV.map((item) => ({
        ...item,
        label: t(item.labelKey),
        description: t(item.descriptionKey),
        disabledBadge: item.disabledBadgeKey ? t(item.disabledBadgeKey) : undefined
      })),
    [t]
  );

  const sections = useMemo(
    () => SECTIONS.map((section) => ({ ...section, label: t(section.labelKey) })),
    [t]
  );

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
      case "clans":
        return CLANS_DISABLED ? <FeedTab /> : <ClansTab />;
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
      {sections.map((section) => (
        <div key={section.key}>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            {section.label}
          </p>
          <div className="space-y-1">
            {navItems.filter((n) => n.section === section.key).map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;

              if (item.disabled) {
                return (
                  <div
                    key={item.id}
                    aria-disabled="true"
                    title={t("community.inWork")}
                    className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-3 opacity-75"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400/70">
                      <Icon size={20} />
                    </span>
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-base font-medium text-red-400 line-through">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs text-red-400/60 line-through">
                          {item.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-red-400">
                        {item.disabledBadge ?? t("community.onWork")}
                      </span>
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setNavOpen(false);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition ${
                    isActive
                      ? "community-nav-active shadow-lg shadow-primary/15"
                      : "hover:bg-white/8"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-primary/30 text-white" : "bg-white/8 text-muted group-hover:text-fg"
                    }`}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-medium">{item.label}</span>
                    <span className="block truncate text-xs text-muted">{item.description}</span>
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
    <div className={`community-hub ${seasonClass} mx-auto min-h-screen max-w-[1800px] px-4 py-5 sm:px-6 sm:py-8`}>
      {alert ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-4 right-4 top-4 z-50 mx-auto flex max-w-lg items-start justify-between gap-3 rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-xl backdrop-blur-md sm:left-auto sm:right-6"
        >
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Bell size={16} /> {t("community.reminderLabel")}
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
              <Sparkles size={12} /> {t("community.hubBadge")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("community.title")}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">{t("community.subtitle")}</p>
          </div>
          <Link
            href="/chat"
            prefetch
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition hover:bg-white/15"
          >
            {t("community.backToChat")}
          </Link>
        </div>
      </header>

      <div className="flex gap-5 lg:gap-6">
        <aside className="hidden w-[240px] shrink-0 lg:block">
          <div className="community-sidebar sticky top-6 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl">
            {navButtons}
          </div>
        </aside>

        {navOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-label={t("community.closeMenu")}
              onClick={() => setNavOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[min(100vw-3rem,320px)] overflow-y-auto border-r border-white/10 bg-card/95 p-4 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">{t("community.navigation")}</span>
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base lg:hidden"
            >
              <Menu size={18} /> {t("community.menu")}
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <active.icon size={22} />
              </span>
              <div>
                <h2 className="text-2xl font-semibold">{activeLabel}</h2>
                <p className="text-base text-muted">{activeDescription}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-2 lg:hidden">
            <div className="flex min-w-max gap-2">
              {navItems.map((item) =>
                item.disabled ? (
                  <span
                    key={item.id}
                    className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-medium"
                    aria-disabled="true"
                  >
                    <span className="text-red-400 line-through">{item.label}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-red-400">
                      {item.disabledBadge ?? t("community.onWork")}
                    </span>
                  </span>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      tab === item.id ? "bg-primary text-white" : "bg-white/10"
                    }`}
                  >
                    {item.label}
                  </button>
                )
              )}
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
