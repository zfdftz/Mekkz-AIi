"use client";

import dynamic from "next/dynamic";
import { Bell, Calendar, CheckSquare, FileText, StickyNote } from "lucide-react";
import { useState } from "react";
import { HubFilesPanel } from "@/components/hub/hub-files-panel";
import { LoadingState } from "@/components/community/shared";

const TasksTab = dynamic(
  () => import("@/components/community/productivity-tabs").then((m) => ({ default: m.TasksTab })),
  { loading: () => <LoadingState /> }
);
const CalendarTab = dynamic(
  () => import("@/components/community/productivity-tabs").then((m) => ({ default: m.CalendarTab })),
  { loading: () => <LoadingState /> }
);
const NotesTab = dynamic(
  () => import("@/components/community/productivity-tabs").then((m) => ({ default: m.NotesTab })),
  { loading: () => <LoadingState /> }
);
const RemindersTab = dynamic(
  () => import("@/components/community/productivity-tabs").then((m) => ({ default: m.RemindersTab })),
  { loading: () => <LoadingState /> }
);

const TABS = [
  { id: "files", label: "Dateien", icon: FileText },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "calendar", label: "Kalender", icon: Calendar },
  { id: "notes", label: "Notizen", icon: StickyNote },
  { id: "reminders", label: "Reminder", icon: Bell }
] as const;

type RightTab = (typeof TABS)[number]["id"];

export function HubRightPanel({ initialTab }: { initialTab?: RightTab }) {
  const [tab, setTab] = useState<RightTab>(initialTab ?? "files");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 p-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                tab === t.id ? "bg-primary text-white" : "bg-white/5 text-muted hover:text-fg"
              }`}
            >
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "files" ? <HubFilesPanel /> : null}
        {tab === "tasks" ? <TasksTab /> : null}
        {tab === "calendar" ? <CalendarTab /> : null}
        {tab === "notes" ? <NotesTab /> : null}
        {tab === "reminders" ? <RemindersTab /> : null}
      </div>
    </div>
  );
}
