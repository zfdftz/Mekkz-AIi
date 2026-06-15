"use client";

import { Brain, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { readJsonResponse } from "@/lib/fetch-json";

type MemoryItem = {
  id: string;
  memory: string;
  category?: string;
  source?: string;
  created_at?: string;
};

type MemoryResponse = {
  error?: string;
  memories?: MemoryItem[];
};

type MemoryManagerProps = {
  userId?: string;
  open: boolean;
};

export function MemoryManager({ userId, open }: MemoryManagerProps) {
  const { t } = useLanguage();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/memory?userId=${userId}`);
        const data = await readJsonResponse<MemoryResponse>(res);
        if (!res.ok) {
          setError(data.error || t("memory.loadError"));
          return;
        }
        setMemories(data.memories ?? []);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [open, userId, t]);

  async function saveMemory() {
    if (!userId || !draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, memory: draft.trim() })
      });
      const data = await readJsonResponse<MemoryResponse>(res);
      if (!res.ok) {
        setError(data.error || t("memory.saveError"));
        return;
      }
      setMemories(data.memories ?? []);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMemory(memoryId: string) {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, memoryId })
      });
      const data = await readJsonResponse<MemoryResponse>(res);
      if (!res.ok) {
        setError(data.error || t("memory.deleteError"));
        return;
      }
      setMemories(data.memories ?? []);
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    if (!userId) return;
    const confirmed = window.confirm(t("memory.clearConfirm"));
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, clearAll: true })
      });
      const data = await readJsonResponse<MemoryResponse>(res);
      if (!res.ok) {
        setError(data.error || t("memory.clearError"));
        return;
      }
      setMemories([]);
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return (
      <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">{t("memory.loginRequired")}</p>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Brain size={14} /> {t("settings.memory")}
          </p>
          <p className="text-sm text-muted">{t("settings.memoryHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium"
        >
          {expanded ? t("memory.hide") : t("memory.view")}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("memory.placeholder")}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm outline-none focus:border-primary/50"
          disabled={saving}
        />
        <button
          type="button"
          onClick={() => void saveMemory()}
          disabled={saving || !draft.trim()}
          className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? t("common.loading") : t("memory.save")}
        </button>
      </div>

      {error ? <p className="text-xs text-red-200">{error}</p> : null}

      {expanded ? (
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted">{t("common.loading")}</p>
          ) : memories.length === 0 ? (
            <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">{t("memory.empty")}</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {memories.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-left">{item.memory}</span>
                  <button
                    type="button"
                    aria-label={t("memory.delete")}
                    onClick={() => void deleteMemory(item.id)}
                    disabled={saving}
                    className="shrink-0 rounded-lg bg-white/10 p-1.5 text-red-200 hover:bg-white/15 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {memories.length > 0 ? (
            <button
              type="button"
              onClick={() => void clearAll()}
              disabled={saving}
              className="w-full rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
            >
              {t("memory.clearAll")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
