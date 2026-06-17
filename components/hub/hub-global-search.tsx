"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/fetch-json";
import type { HubSearchResult } from "@/lib/hub/types";

export function HubGlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<HubSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/hub/search?q=${encodeURIComponent(query.trim())}`);
    const data = await readJsonResponse<{ results?: HubSearchResult[] }>(res);
    if (res.ok) setResults(data.results ?? []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void search(q), 250);
    return () => window.clearTimeout(timer);
  }, [q, search]);

  return (
    <div className="relative mb-3">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
        <Search size={16} className="shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Suche Chats, Dateien, Notizen…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
        />
        {q ? (
          <button type="button" onClick={() => setQ("")} className="text-muted hover:text-fg">
            <X size={14} />
          </button>
        ) : null}
      </div>
      {open && results.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-card/95 p-1 shadow-xl backdrop-blur-md">
          {results.map((r) => (
            <button
              key={`${r.kind}-${r.id}`}
              type="button"
              onClick={() => {
                router.push(r.href as Route);
                setOpen(false);
                setQ("");
              }}
              className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-white/10"
            >
              <span className="text-xs uppercase text-primary">{r.kind}</span>
              <span className="text-sm font-medium">{r.title}</span>
              <span className="truncate text-xs text-muted">{r.snippet}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
