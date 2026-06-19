"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyAppearance, loadAppearance, subscribeAppearance, type ThemeMode } from "@/lib/theme-config";

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = loadAppearance();
    setMode(saved.mode);

    return subscribeAppearance(({ mode: nextMode }) => {
      setMode(nextMode);
    });
  }, []);

  const toggle = () => {
    const saved = loadAppearance();
    const next: ThemeMode = saved.mode === "dark" ? "light" : "dark";
    setMode(next);
    applyAppearance(next, saved.color);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Theme wechseln"
      className="glass rounded-xl p-2 transition hover:scale-105"
    >
      {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
