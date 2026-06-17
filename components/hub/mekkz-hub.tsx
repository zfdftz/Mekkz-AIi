"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ChatUI } from "@/components/chat-ui";
import { HubBottomPanel } from "@/components/hub/hub-bottom-panel";
import { HubLeftSidebar } from "@/components/hub/hub-left-sidebar";
import { HubRightPanel } from "@/components/hub/hub-right-panel";
import { MekkzLogo } from "@/components/mekkz-logo";
import { WavyBackground } from "@/components/wavy-background";
import { homePathForLayout } from "@/lib/hub/layout-preference";

export function MekkzHub({
  userId,
  userEmail,
  isGuest
}: {
  userId: string;
  userEmail: string;
  isGuest: boolean;
}) {
  const searchParams = useSearchParams();
  const panel = searchParams.get("panel");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [bottomExpanded, setBottomExpanded] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectChat = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent("mekkz-hub-select-chat", { detail: id }));
  }, []);

  const newChat = useCallback(() => {
    window.dispatchEvent(new Event("mekkz-hub-new-chat"));
  }, []);

  const rightInitial =
    panel === "tasks" || panel === "calendar" || panel === "notes" || panel === "files"
      ? panel
      : undefined;
  const bottomInitial =
    panel === "feed" || panel === "friends" || panel === "groups" ? panel : undefined;

  return (
    <WavyBackground>
      <div className="hub-shell flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden">
        <header className="hub-topbar flex shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-3 py-2 backdrop-blur-md sm:px-4">
          <MekkzLogo size={26} textClassName="text-sm font-bold sm:text-base" />
          <p className="hidden text-xs text-muted sm:block">Dein zentraler Workspace</p>
          <div className="flex items-center gap-2">
            <Link
              href={homePathForLayout("classic")}
              className="hidden rounded-lg border border-white/10 px-2 py-1 text-[10px] text-muted hover:bg-white/10 sm:inline"
              title="Klassisches Layout"
            >
              Classic
            </Link>
            <Link
              href="/tools"
              className="rounded-xl bg-white/10 px-2 py-1.5 text-xs font-medium hover:bg-white/15"
            >
              Tools
            </Link>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl bg-white/10 p-2 hover:bg-white/15"
              aria-label="Einstellungen"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        <div className="hub-grid min-h-0 flex-1">
          <aside className="hub-left hidden min-h-0 overflow-hidden border-r border-white/10 bg-black/25 lg:block">
            <HubLeftSidebar
              userId={userId}
              activeConversationId={activeConversationId}
              onSelectChat={selectChat}
              onNewChat={newChat}
            />
          </aside>

          <main className="hub-center min-h-0 overflow-hidden p-1 sm:p-2">
            <ChatUI
              userId={userId}
              userEmail={userEmail}
              isGuest={isGuest}
              hubMode
              onActiveConversationChange={setActiveConversationId}
            />
          </main>

          <aside className="hub-right hidden min-h-0 overflow-hidden border-l border-white/10 bg-black/25 xl:block">
            <HubRightPanel initialTab={rightInitial} />
          </aside>
        </div>

        <HubBottomPanel
          expanded={bottomExpanded}
          onToggle={() => setBottomExpanded((v) => !v)}
          initialTab={bottomInitial}
        />
      </div>

      {settingsOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card p-4">
            <p className="mb-2 font-semibold">Layout</p>
            <p className="mb-4 text-sm text-muted">
              Du nutzt Mekkz Hub. In den Einstellungen kannst du jederzeit zum klassischen Chat
              zurückwechseln.
            </p>
            <div className="flex gap-2">
              <Link
                href="/chat"
                className="btn-primary flex-1 rounded-xl py-2 text-center text-sm"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("mekkz_layout", "classic");
                    document.cookie = "mekkz_layout=classic; path=/; max-age=31536000; SameSite=Lax";
                  }
                }}
              >
                Classic Layout
              </Link>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WavyBackground>
  );
}
