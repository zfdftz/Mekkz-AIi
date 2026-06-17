"use client";

import dynamic from "next/dynamic";
import { Bell, ChevronDown, ChevronUp, Globe, Users, UsersRound, Wifi } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/community/shared";
import { ProfileProvider } from "@/components/community/profile-context";
import { readJsonResponse } from "@/lib/fetch-json";
import type { HubNotification } from "@/lib/hub/types";

const FeedTab = dynamic(
  () => import("@/components/community/feed-tab").then((m) => ({ default: m.FeedTab })),
  { loading: () => <LoadingState label="Feed…" /> }
);
const FriendsTab = dynamic(
  () => import("@/components/community/friends-tab").then((m) => ({ default: m.FriendsTab })),
  { loading: () => <LoadingState label="Freunde…" /> }
);
const GroupsTab = dynamic(
  () => import("@/components/community/groups-tab").then((m) => ({ default: m.GroupsTab })),
  { loading: () => <LoadingState label="Gruppen…" /> }
);

const TABS = [
  { id: "feed", label: "Feed", icon: Globe },
  { id: "friends", label: "Freunde", icon: Users },
  { id: "groups", label: "Gruppen", icon: UsersRound },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "online", label: "Online", icon: Wifi }
] as const;

type BottomTab = (typeof TABS)[number]["id"];

export function HubBottomPanel({
  expanded,
  onToggle,
  initialTab
}: {
  expanded: boolean;
  onToggle: () => void;
  initialTab?: BottomTab;
}) {
  const [tab, setTab] = useState<BottomTab>(initialTab ?? "feed");
  const [notifications, setNotifications] = useState<HubNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/hub/notifications");
    const data = await readJsonResponse<{ notifications?: HubNotification[]; unread?: number }>(res);
    if (res.ok) {
      setNotifications(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <ProfileProvider>
      <div
        className={`hub-bottom flex min-h-0 flex-col border-t border-white/10 bg-black/30 backdrop-blur-xl transition-all ${
          expanded ? "h-[min(42vh,420px)]" : "h-11"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex shrink-0 items-center justify-between px-4 py-2 text-left hover:bg-white/5"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            Community & Collaboration
            {unread > 0 ? (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-white">
                {unread}
              </span>
            ) : null}
          </span>
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        {expanded ? (
          <>
            <div className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
                      tab === t.id ? "bg-primary text-white" : "bg-white/10 text-muted"
                    }`}
                  >
                    <Icon size={12} /> {t.label}
                  </button>
                );
              })}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {tab === "feed" ? <FeedTab /> : null}
              {tab === "friends" ? <FriendsTab /> : null}
              {tab === "groups" ? <GroupsTab /> : null}
              {tab === "notifications" ? (
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">Keine Benachrichtigungen</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl border border-white/10 p-3 text-sm ${
                          n.read ? "opacity-70" : "bg-primary/10"
                        }`}
                      >
                        <p className="font-medium">{n.title}</p>
                        {n.body ? <p className="mt-1 text-xs text-muted">{n.body}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
              {tab === "online" ? (
                <p className="py-6 text-center text-sm text-muted">
                  Online-Status über Freunde & Community sichtbar
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </ProfileProvider>
  );
}
