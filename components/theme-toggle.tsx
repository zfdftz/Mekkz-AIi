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
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    const { color } = loadAppearance();
    setMode(next);
    applyAppearance(next, color);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Theme wechseln"
      className="glass rounded-xl p-2 transition hover:scale-105"
    >
      {mode === "dark" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
