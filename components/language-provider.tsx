"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  type LanguageOption,
  normalizeLanguage
} from "@/lib/languages";
import { translate, type TranslationKey } from "@/lib/i18n/messages";

type LanguageContextValue = {
  language: LanguageCode;
  languages: LanguageOption[];
  ready: boolean;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored ? normalizeLanguage(stored) : null;
  } catch {
    return null;
  }
}

function persistLanguage(language: LanguageCode) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage errors in private mode.
  }
  document.documentElement.lang = language;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  const applyLanguage = useCallback(async (next: LanguageCode, autoDetected = false) => {
    setLanguageState(next);
    persistLanguage(next);

    await fetch("/api/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next, autoDetected })
    }).catch(() => {
      // Cookie/local preference still works offline.
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = readStoredLanguage();
      let resolved = stored ?? DEFAULT_LANGUAGE;

      if (stored) {
        document.documentElement.lang = stored;
      }

      const syncRes = await fetch("/api/language").catch(() => null);
      if (syncRes?.ok) {
        const data = (await syncRes.json()) as {
          language?: string;
          source?: string;
          autoDetected?: boolean;
        };
        const synced = normalizeLanguage(data.language);
        const explicitSaved = data.source === "saved" && data.autoDetected === false;
        // Explicit DB preference wins; auto-detected server values must not clobber localStorage.
        if (explicitSaved || !stored) {
          resolved = synced;
          if (!cancelled) persistLanguage(synced);
        }
      } else if (!stored) {
        const detectRes = await fetch("/api/language", { method: "PUT" }).catch(() => null);
        if (detectRes?.ok) {
          const data = (await detectRes.json()) as { language?: string };
          resolved = normalizeLanguage(data.language);
          if (!cancelled) persistLanguage(resolved);
          await fetch("/api/language", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language: resolved, autoDetected: true })
          }).catch(() => undefined);
        }
      }

      if (!cancelled) {
        setLanguageState(resolved);
        document.documentElement.lang = resolved;
        setReady(true);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languages: SUPPORTED_LANGUAGES,
      ready,
      setLanguage: (next) => applyLanguage(next, false),
      t: (key, vars) => translate(language, key, vars)
    }),
    [language, ready, applyLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

export function useOptionalLanguage() {
  return useContext(LanguageContext);
}
