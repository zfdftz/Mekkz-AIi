"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { useAiPreferences } from "@/hooks/use-ai-preferences";
import {
  applyAppearance,
  COLOR_THEMES,
  loadAppearance,
  type ColorTheme,
  type ThemeMode
} from "@/lib/theme-config";
import type { LanguageCode } from "@/lib/languages";
import { normalizePersonalityMode, PERSONALITY_MODES, type PersonalityMode } from "@/lib/personality";

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
  const { preferences: aiPreferences, loading: prefsLoading, updatePreferences } =
    useAiPreferences(userId);
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [color, setColor] = useState<ColorTheme>("violet");
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [styleLoading, setStyleLoading] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [customInstructionsDraft, setCustomInstructionsDraft] = useState("");
  const customInstructionsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditingCustomInstructionsRef = useRef(false);

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
    if (isEditingCustomInstructionsRef.current) return;
    setCustomInstructionsDraft(aiPreferences.customInstructions ?? "");
  }, [aiPreferences.customInstructions]);

  useEffect(() => {
    if (!open) {
      isEditingCustomInstructionsRef.current = false;
    }
  }, [open]);

  function scheduleCustomInstructionsSave(nextValue: string) {
    if (!userId) return;
    if (customInstructionsSaveTimer.current) {
      clearTimeout(customInstructionsSaveTimer.current);
    }
    customInstructionsSaveTimer.current = setTimeout(() => {
      void updatePreferences({ customInstructions: nextValue });
    }, 700);
  }

  function handleCustomInstructionsChange(nextValue: string) {
    isEditingCustomInstructionsRef.current = true;
    setCustomInstructionsDraft(nextValue);
    scheduleCustomInstructionsSave(nextValue);
  }

  async function flushCustomInstructionsSave() {
    if (!userId) return;
    if (customInstructionsSaveTimer.current) {
      clearTimeout(customInstructionsSaveTimer.current);
      customInstructionsSaveTimer.current = null;
    }
    await updatePreferences({ customInstructions: customInstructionsDraft });
    isEditingCustomInstructionsRef.current = false;
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
                    onBlur={() => void flushCustomInstructionsSave()}
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
                  value={aiPreferences.personalityMode}
                  disabled={!userId || prefsLoading}
                  onChange={(event) => {
                    const personalityMode = normalizePersonalityMode(
                      event.target.value
                    ) as PersonalityMode;
                    void updatePreferences({ personalityMode });
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm outline-none transition focus:border-primary/50 disabled:opacity-50"
                >
                  {PERSONALITY_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id} className="bg-neutral-900">
                      {t(mode.labelKey as Parameters<typeof t>[0])}
                      {mode.popular ? ` (${t("personality.popular")})` : ""}
                    </option>
                  ))}
                </select>
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
