"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import {
  applyAppearance,
  COLOR_THEMES,
  loadAppearance,
  type ColorTheme,
  type ThemeMode
} from "@/lib/theme-config";
import type { LanguageCode } from "@/lib/languages";
import { readJsonResponse } from "@/lib/fetch-json";
import { normalizePersonalityMode, PERSONALITY_MODES, type PersonalityMode } from "@/lib/personality";
import { TUTOR_LEVELS, type TutorLevel } from "@/lib/tutor";
import {
  patchCachedAiPreferences,
  readCachedAiPreferences,
  writeCachedAiPreferences
} from "@/lib/ai-preferences-client";
import type { UserAiPreferences } from "@/lib/user-ai-preferences";
import { DEFAULT_AI_PREFERENCES } from "@/lib/user-ai-preferences";

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
  isGuest?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
};

type StyleProfile = {
  enabled: boolean;
};

type AiPreferencesResponse = {
  error?: string;
  preferences?: UserAiPreferences;
};

export function SettingsPanel({
  open,
  onClose,
  userId,
  userEmail,
  isGuest = false,
  onLogin,
  onLogout
}: SettingsPanelProps) {
  const { language, languages, setLanguage, t } = useLanguage();
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [color, setColor] = useState<ColorTheme>("violet");
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [aiPreferences, setAiPreferences] = useState<UserAiPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [customInstructionsDraft, setCustomInstructionsDraft] = useState("");
  const customInstructionsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styleLearningEnabled = styleProfile?.enabled ?? true;

  useEffect(() => {
    if (!open) return;
    const saved = loadAppearance();
    setMode(saved.mode);
    setColor(saved.color);
  }, [open]);

  useEffect(() => {
    if (!open || !userId) return;

    async function loadStyle() {
      setStyleLoading(true);
      const res = await fetch(`/api/communication-style?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setStyleProfile(data.profile);
      }
      setStyleLoading(false);
    }

    void loadStyle();
  }, [open, userId]);

  useEffect(() => {
    if (!userId) return;
    const uid = userId;

    const cached = readCachedAiPreferences(uid);
    if (cached) {
      setAiPreferences(cached);
      setCustomInstructionsDraft(cached.customInstructions ?? "");
      window.dispatchEvent(new CustomEvent("mekkz-ai-preferences", { detail: cached }));
    }

    async function loadPreferences() {
      setPrefsLoading(true);
      const res = await fetch(`/api/ai-preferences?userId=${uid}&_=${Date.now()}`, {
        cache: "no-store"
      });
      const data = await readJsonResponse<AiPreferencesResponse>(res);
      if (res.ok && data.preferences) {
        setAiPreferences(data.preferences);
        setCustomInstructionsDraft(data.preferences.customInstructions ?? "");
        writeCachedAiPreferences(uid, data.preferences);
        window.dispatchEvent(
          new CustomEvent("mekkz-ai-preferences", { detail: data.preferences })
        );
      }
      setPrefsLoading(false);
    }

    void loadPreferences();
  }, [userId]);

  useEffect(() => {
    if (!open || !userId || aiPreferences) return;
    const cached = readCachedAiPreferences(userId);
    if (cached) setAiPreferences(cached);
  }, [open, userId, aiPreferences]);

  async function updateAiPreferences(patch: Partial<UserAiPreferences>) {
    if (!userId) return;

    const optimistic = patchCachedAiPreferences(
      userId,
      patch,
      aiPreferences ?? readCachedAiPreferences(userId) ?? DEFAULT_AI_PREFERENCES
    );
    setAiPreferences(optimistic);
    window.dispatchEvent(new CustomEvent("mekkz-ai-preferences", { detail: optimistic }));
    setPrefsLoading(true);

    const res = await fetch("/api/ai-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch })
    });
    const data = await readJsonResponse<AiPreferencesResponse>(res);

    if (res.ok && data.preferences) {
      setAiPreferences(data.preferences);
      writeCachedAiPreferences(userId, data.preferences);
      window.dispatchEvent(
        new CustomEvent("mekkz-ai-preferences", { detail: data.preferences })
      );
    }
    setPrefsLoading(false);
  }

  function scheduleCustomInstructionsSave(nextValue: string) {
    if (!userId) return;
    if (customInstructionsSaveTimer.current) {
      clearTimeout(customInstructionsSaveTimer.current);
    }
    customInstructionsSaveTimer.current = setTimeout(() => {
      void updateAiPreferences({ customInstructions: nextValue });
    }, 700);
  }

  function handleCustomInstructionsChange(nextValue: string) {
    setCustomInstructionsDraft(nextValue);
    scheduleCustomInstructionsSave(nextValue);
  }

  useEffect(() => {
    return () => {
      if (customInstructionsSaveTimer.current) {
        clearTimeout(customInstructionsSaveTimer.current);
      }
    };
  }, []);

  async function toggleStyleLearning(enabled: boolean) {
    if (!userId) return;
    setStyleLoading(true);

    const res = await fetch("/api/communication-style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, enabled })
    });
    const data = await res.json();

    if (res.ok) {
      setStyleProfile(data.profile);
    }
    setStyleLoading(false);
  }

  function setThemeMode(next: ThemeMode) {
    setMode(next);
    applyAppearance(next, color);
  }

  function setColorTheme(next: ColorTheme) {
    setColor(next);
    applyAppearance(mode, next);
  }

  function handleLogoutClick() {
    const shouldLogout = window.confirm(t("settings.logoutConfirm"));
    if (!shouldLogout || !onLogout) return;
    onLogout();
  }

  async function handleLanguageChange(next: LanguageCode) {
    setLanguageSaving(true);
    try {
      await setLanguage(next);
    } finally {
      setLanguageSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label={t("settings.close")}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="glass fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-xl font-semibold">{t("settings.title")}</h2>
                <p className="mt-1 text-xs text-muted">
                  {t("settings.appearance")} · {t("settings.colorTheme")} · {t("settings.communication")}
                </p>
              </div>
              <button onClick={onClose} className="rounded-xl bg-white/10 p-2">
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <section className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                  {t("settings.appearance")}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setThemeMode("dark")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition ${
                      mode === "dark" ? "bg-primary text-white" : "bg-white/10"
                    }`}
                  >
                    <Moon size={16} /> {t("settings.dark")}
                  </button>
                  <button
                    onClick={() => setThemeMode("light")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition ${
                      mode === "light" ? "bg-primary text-white" : "bg-white/10"
                    }`}
                  >
                    <Sun size={16} /> {t("settings.light")}
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                  {t("settings.colorTheme")}
                </h3>
                <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
                  {COLOR_THEMES.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setColorTheme(preset.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        color === preset.id
                          ? "border-primary bg-primary/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="mb-2 flex gap-1">
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ background: preset.swatch[0] }}
                        />
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ background: preset.swatch[1] }}
                        />
                      </div>
                      <span className="text-sm">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border-2 border-primary/40 bg-primary/10 p-4 shadow-glow">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {t("settings.communication")}
                    </p>
                    <h3 className="text-base font-semibold">{t("settings.communicationStyle")}</h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      styleLearningEnabled
                        ? "bg-emerald-500/20 text-emerald-100"
                        : "bg-white/10 text-muted"
                    }`}
                  >
                    {styleLearningEnabled
                      ? t("settings.styleActive")
                      : t("settings.styleInactive")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!userId || styleLoading}
                    onClick={() => void toggleStyleLearning(true)}
                    className={`rounded-xl px-3 py-3 text-sm font-medium transition disabled:opacity-50 ${
                      styleLearningEnabled
                        ? "bg-primary text-white shadow-glow"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    {styleLoading && styleLearningEnabled
                      ? t("settings.styleLoading")
                      : t("settings.styleActive")}
                  </button>
                  <button
                    type="button"
                    disabled={!userId || styleLoading}
                    onClick={() => void toggleStyleLearning(false)}
                    className={`rounded-xl px-3 py-3 text-sm font-medium transition disabled:opacity-50 ${
                      !styleLearningEnabled
                        ? "bg-primary text-white shadow-glow"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    {styleLoading && !styleLearningEnabled
                      ? t("settings.styleLoading")
                      : t("settings.styleInactive")}
                  </button>
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                    {t("settings.customInstructions")}
                  </h3>
                  <p className="text-base leading-relaxed text-muted">
                    {t("settings.customInstructionsHint")}
                  </p>
                </div>
                {!userId ? (
                  <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">
                    {t("settings.customInstructionsLoginRequired")}
                  </p>
                ) : (
                  <textarea
                    value={customInstructionsDraft}
                    onChange={(event) => handleCustomInstructionsChange(event.target.value)}
                    onBlur={() =>
                      void updateAiPreferences({ customInstructions: customInstructionsDraft })
                    }
                    disabled={prefsLoading}
                    rows={5}
                    maxLength={800}
                    placeholder={t("settings.customInstructionsPlaceholder")}
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-base leading-relaxed outline-none transition focus:border-primary/50 disabled:opacity-50"
                  />
                )}
              </section>

              <section className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                    {t("settings.personality")}
                  </h3>
                  <p className="text-sm text-muted">{t("settings.personalityHint")}</p>
                </div>
                <select
                  value={aiPreferences?.personalityMode ?? "normal"}
                  disabled={!userId || prefsLoading}
                  onChange={(event) => {
                    const personalityMode = normalizePersonalityMode(
                      event.target.value
                    ) as PersonalityMode;
                    void updateAiPreferences({ personalityMode });
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm outline-none transition focus:border-primary/50 disabled:opacity-50"
                >
                  {PERSONALITY_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id} className="bg-neutral-900">
                      {t(mode.labelKey as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </section>

              <section className="space-y-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                      {t("settings.tutor")}
                    </h3>
                    <p className="text-sm text-muted">{t("settings.tutorHint")}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      aiPreferences?.tutorModeEnabled
                        ? "bg-emerald-500/20 text-emerald-100"
                        : "bg-white/10 text-muted"
                    }`}
                  >
                    {aiPreferences?.tutorModeEnabled
                      ? t("settings.tutorEnabled")
                      : t("settings.tutorDisabled")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!userId || prefsLoading}
                    onClick={() => void updateAiPreferences({ tutorModeEnabled: true })}
                    className={`rounded-xl px-3 py-3 text-sm font-medium transition disabled:opacity-50 ${
                      aiPreferences?.tutorModeEnabled
                        ? "bg-primary text-white shadow-glow"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    {t("settings.tutorEnabled")}
                  </button>
                  <button
                    type="button"
                    disabled={!userId || prefsLoading}
                    onClick={() => void updateAiPreferences({ tutorModeEnabled: false })}
                    className={`rounded-xl px-3 py-3 text-sm font-medium transition disabled:opacity-50 ${
                      !aiPreferences?.tutorModeEnabled
                        ? "bg-primary text-white shadow-glow"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    {t("settings.tutorDisabled")}
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {t("settings.tutorLevel")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {TUTOR_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        disabled={!userId || prefsLoading}
                        onClick={() => void updateAiPreferences({ tutorLevel: level })}
                        className={`rounded-xl px-2 py-2.5 text-xs font-medium transition disabled:opacity-50 sm:text-sm ${
                          aiPreferences?.tutorLevel === level
                            ? "bg-primary text-white"
                            : "bg-white/10 hover:bg-white/15"
                        }`}
                      >
                        {t(`tutor.${level}` as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                  {t("settings.language")}
                </h3>
                <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">
                  {t("settings.languageHint")}
                </p>
                <select
                  value={language}
                  disabled={languageSaving}
                  onChange={(event) => void handleLanguageChange(event.target.value as LanguageCode)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm outline-none transition focus:border-primary/50 disabled:opacity-50"
                >
                  {languages.map((option) => (
                    <option key={option.code} value={option.code} className="bg-neutral-900">
                      {option.nativeLabel} ({option.label})
                    </option>
                  ))}
                </select>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                  {t("settings.account")}
                </h3>
                {isGuest ? (
                  <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">
                    {t("settings.guestHint")}
                  </p>
                ) : userEmail ? (
                  <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">{userEmail}</p>
                ) : null}
                {isGuest && onLogin ? (
                  <button
                    onClick={onLogin}
                    className="w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    {t("settings.login")}
                  </button>
                ) : null}
                {!isGuest && onLogout ? (
                  <button
                    onClick={handleLogoutClick}
                    className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm transition hover:bg-white/15"
                  >
                    {t("settings.logout")}
                  </button>
                ) : null}
              </section>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
