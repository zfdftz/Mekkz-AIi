"use client";

import Link from "next/link";
import { useState } from "react";
import { SettingsPanel } from "@/components/settings-panel";
import { WavyBackground } from "@/components/wavy-background";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const [open, setOpen] = useState(true);

  return (
    <WavyBackground>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Einstellungen</h1>
          <button onClick={() => setOpen(true)} className="glass rounded-xl p-2">
            <Settings size={18} />
          </button>
        </div>
        <p className="text-sm text-muted">
          Öffne das Einstellungs-Panel für Theme, Farben und Konto.
        </p>
        <Link href="/chat" className="btn-primary mt-6 inline-flex w-fit rounded-xl px-4 py-2">
          Zurück zum Chat
        </Link>
      </main>
      <SettingsPanel open={open} onClose={() => setOpen(false)} />
    </WavyBackground>
  );
}
