"use client";

import { useEffect, useRef, useState } from "react";
import { readJsonResponse } from "@/lib/fetch-json";
import type { ReminderItem } from "@/lib/community/types";

export function useReminderAlerts(enabled = true) {
  const [alert, setAlert] = useState<ReminderItem | null>(null);
  const fired = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/productivity?resource=reminders");
        const data = await readJsonResponse<{ reminders?: ReminderItem[] }>(res);
        if (!res.ok || cancelled) return;
        const now = Date.now();
        for (const item of data.reminders ?? []) {
          if (item.isDone || fired.current.has(item.id)) continue;
          const due = new Date(item.remindAt).getTime();
          if (due <= now && due > now - 5 * 60 * 1000) {
            fired.current.add(item.id);
            setAlert(item);
            break;
          }
        }
      } catch {
        // ignore polling errors
      }
    }

    void check();
    const id = window.setInterval(() => void check(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  return { alert, dismiss: () => setAlert(null) };
}
