"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyAppearance,
  COLOR_THEMES,
  loadAppearance,
  type ColorTheme,
  type ThemeMode
} from "@/lib/theme-config";

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  userId?: string;
  userEmail?: string;
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
  onLogout
}: SettingsPanelProps) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [color, setColor] = useState<ColorTheme>("violet");
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [styleLoading, setStyleLoading] = useState(false);

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
    const shouldLogout = window.confirm("Wirklich abmelden?");
    if (!shouldLogout || !onLogout) return;
    onLogout();
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            aria-label="Einstellungen schließen"
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
              <h2 className="text-xl font-semibold">Einstellungen</h2>
              <button onClick={onClose} className="rounded-xl bg-white/10 p-2">
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <section className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Darstellung</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setThemeMode("dark")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition ${
                      mode === "dark" ? "bg-primary text-white" : "bg-white/10"
                    }`}
                  >
                    <Moon size={16} /> Dunkel
                  </button>
                  <button
                    onClick={() => setThemeMode("light")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition ${
                      mode === "light" ? "bg-primary text-white" : "bg-white/10"
                    }`}
                  >
                    <Sun size={16} /> Hell
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Farb-Theme</h3>
                <div className="grid grid-cols-2 gap-2">
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

              <section className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                  Kommunikationsstil
                </h3>
                <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">
                  mekkz AI merkt sich nur Slang, Jugendsprache und spezielle Wörter
                  — keine normalen Alltagswörter wie „Bild“ oder „Chat“.
                </p>
                <button
                  type="button"
                  disabled={!userId || styleLoading}
                  onClick={() => void toggleStyleLearning(!(styleProfile?.enabled ?? true))}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm transition disabled:opacity-50 ${
                    styleProfile?.enabled ?? true
                      ? "bg-primary text-white"
                      : "bg-white/10 hover:bg-white/15"
                  }`}
                >
                  {styleLoading
                    ? "Lade..."
                    : styleProfile?.enabled ?? true
                      ? "Stil-Lernen aktiv"
                      : "Stil-Lernen aus"}
                </button>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
                  Chat-Verlauf
                </h3>
                <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">
                  Chats links mit dem X-Symbol löschen. Gelöschte Unterhaltungen
                  können nicht wiederhergestellt werden.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Konto</h3>
                {userEmail ? (
                  <p className="rounded-xl bg-white/5 px-3 py-2 text-sm text-muted">{userEmail}</p>
                ) : null}
                {onLogout ? (
                  <button
                    onClick={handleLogoutClick}
                    className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm transition hover:bg-white/15"
                  >
                    Abmelden
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
