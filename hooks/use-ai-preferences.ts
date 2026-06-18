"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  patchCachedAiPreferences,
  readCachedAiPreferences,
  stripCacheMeta,
  writeCachedAiPreferences,
  type CachedAiPreferences
} from "@/lib/ai-preferences-client";
import { readJsonResponse } from "@/lib/fetch-json";
import type { UserAiPreferences } from "@/lib/user-ai-preferences";
import { DEFAULT_AI_PREFERENCES } from "@/lib/user-ai-preferences";

type AiPreferencesResponse = {
  error?: string;
  preferences?: UserAiPreferences & { updatedAt?: string | null };
};

function mergePreferences(
  local: CachedAiPreferences | null,
  remote: UserAiPreferences & { updatedAt?: string | null }
): UserAiPreferences {
  if (!local?.cachedAt) return remote;

  const localTime = new Date(local.cachedAt).getTime();
  const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;

  if (localTime > remoteTime) {
    return { ...remote, ...stripCacheMeta(local) };
  }

  return remote;
}

function preferencesDiffer(a: UserAiPreferences, b: UserAiPreferences) {
  return (
    a.personalityMode !== b.personalityMode ||
    a.tutorModeEnabled !== b.tutorModeEnabled ||
    a.tutorLevel !== b.tutorLevel ||
    a.voiceOutputEnabled !== b.voiceOutputEnabled ||
    a.voiceAutoSend !== b.voiceAutoSend ||
    a.voiceGender !== b.voiceGender ||
    a.customInstructions !== b.customInstructions
  );
}

export function useAiPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<UserAiPreferences>(DEFAULT_AI_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const hydratedRef = useRef(false);

  const applyPreferences = useCallback(
    (next: UserAiPreferences, options?: { cachedAt?: string; broadcast?: boolean }) => {
      setPreferences(next);
      if (!userId) return;

      writeCachedAiPreferences(userId, next, options?.cachedAt);
      if (options?.broadcast !== false) {
        window.dispatchEvent(new CustomEvent("mekkz-ai-preferences", { detail: next }));
      }
    },
    [userId]
  );

  useLayoutEffect(() => {
    if (!userId) {
      setPreferences(DEFAULT_AI_PREFERENCES);
      hydratedRef.current = false;
      return;
    }

    const cached = readCachedAiPreferences(userId);
    if (cached) {
      setPreferences(stripCacheMeta(cached));
      hydratedRef.current = true;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const uid = userId;

    let cancelled = false;

    async function loadFromServer() {
      setLoading(true);
      try {
        const res = await fetch(`/api/ai-preferences?userId=${uid}&_=${Date.now()}`, {
          cache: "no-store"
        });
        const data = await readJsonResponse<AiPreferencesResponse>(res);
        if (cancelled || !res.ok || !data.preferences) return;

        const local = readCachedAiPreferences(uid);
        const merged = mergePreferences(local, data.preferences);

        applyPreferences(merged, {
          cachedAt: data.preferences.updatedAt ?? local?.cachedAt,
          broadcast: true
        });

        if (local && preferencesDiffer(merged, data.preferences)) {
          void fetch("/api/ai-preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid, ...merged })
          }).catch(() => undefined);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFromServer();

    function onPreferences(event: Event) {
      const detail = (event as CustomEvent<UserAiPreferences>).detail;
      if (detail) setPreferences(detail);
    }

    window.addEventListener("mekkz-ai-preferences", onPreferences);
    return () => {
      cancelled = true;
      window.removeEventListener("mekkz-ai-preferences", onPreferences);
    };
  }, [userId, applyPreferences]);

  const updatePreferences = useCallback(
    async (patch: Partial<UserAiPreferences>) => {
      if (!userId) return;

      const optimistic = patchCachedAiPreferences(
        userId,
        patch,
        preferences ?? readCachedAiPreferences(userId) ?? DEFAULT_AI_PREFERENCES
      );
      applyPreferences(optimistic);
      setLoading(true);

      try {
        const res = await fetch("/api/ai-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ...patch })
        });
        const data = await readJsonResponse<AiPreferencesResponse>(res);

        if (res.ok && data.preferences) {
          applyPreferences(data.preferences, {
            cachedAt: data.preferences.updatedAt ?? new Date().toISOString()
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, preferences, applyPreferences]
  );

  return { preferences, loading, updatePreferences, hydrated: hydratedRef.current };
}
