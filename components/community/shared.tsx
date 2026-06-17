"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ProfileLink } from "@/components/community/profile-context";
import { ProfileIdentity } from "@/components/rewards/profile-identity";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`community-panel rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 shadow-lg shadow-black/20 backdrop-blur-md sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-1">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {description ? <p className="mt-1.5 max-w-2xl text-base text-muted">{description}</p> : null}
    </div>
  );
}

export function ChatLayout({
  sidebar,
  main,
  sidebarTitle,
  mobileView = "both"
}: {
  sidebar: ReactNode;
  main: ReactNode;
  sidebarTitle?: string;
  /** On phones: show only sidebar list, only chat, or both stacked. */
  mobileView?: "sidebar" | "main" | "both";
}) {
  const hideSidebar = mobileView === "main";
  const hideMain = mobileView === "sidebar";

  return (
    <div className="grid gap-3 lg:gap-5 xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
      <Panel
        className={`flex min-h-0 flex-col overflow-hidden ${
          hideSidebar ? "hidden xl:flex" : "flex"
        } max-h-[min(50dvh,420px)] xl:max-h-[85vh] xl:min-h-[520px]`}
      >
        {sidebarTitle ? (
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{sidebarTitle}</p>
        ) : null}
        {sidebar}
      </Panel>
      <Panel
        className={`flex min-h-0 flex-col overflow-hidden ${
          hideMain ? "hidden xl:flex" : "flex"
        } min-h-[min(65dvh,560px)] xl:max-h-[85vh] xl:min-h-[520px]`}
      >
        {main}
      </Panel>
    </div>
  );
}

export function SideListButton({
  active,
  onClick,
  title,
  subtitle,
  leading
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 text-left text-base transition ${
        active ? "community-nav-active shadow-md" : "hover:bg-white/8"
      }`}
    >
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          {subtitle ? <p className="mt-1 line-clamp-2 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
    </button>
  );
}

export function PillTabs({
  items,
  value,
  onChange
}: {
  items: { id: string; label: string; icon?: LucideIcon }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-medium transition ${
              active
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "border border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            {Icon ? <Icon size={16} /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function LoadingState({ label = "Laden…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-base text-muted">
      <Loader2 size={18} className="animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-base text-red-200">
      {message}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-base text-muted">
      {children}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-muted">{children}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-base outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-base outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={loading || props.disabled}
      className={`rounded-xl bg-primary px-5 py-3 text-base font-medium text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-50 ${props.className ?? ""}`}
    >
      {loading ? <Loader2 size={16} className="mx-auto animate-spin" /> : children}
    </button>
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50 ${props.className ?? ""}`}
    >
      {props.children}
    </button>
  );
}

export function MessageBubble({
  author,
  authorUserId,
  authorTitle,
  authorVerified,
  authorCreator,
  authorChosen,
  authorUltraCreator,
  content,
  highlight,
  time
}: {
  author: string;
  authorUserId?: string | null;
  authorTitle?: string | null;
  authorVerified?: boolean;
  authorCreator?: boolean;
  authorChosen?: boolean;
  authorUltraCreator?: boolean;
  content: string;
  highlight?: boolean;
  time?: string;
}) {
  return (
    <div
      className={`rounded-2xl px-5 py-4 text-[17px] leading-relaxed shadow-sm sm:text-lg sm:leading-relaxed ${
        highlight
          ? "border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5"
          : "border border-white/5 bg-black/20"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {authorUserId ? (
          <ProfileLink userId={authorUserId} className="min-w-0">
            <ProfileIdentity
              compact
              username={author.replace(/^@/, "")}
              title={authorTitle}
              isVerified={authorVerified}
              isCreator={authorCreator}
              isChosen={authorChosen}
              isUltraCreator={authorUltraCreator}
            />
          </ProfileLink>
        ) : (
          <span className="font-semibold text-primary">{author}</span>
        )}
        {time ? (
          <span className="text-sm text-muted">{new Date(time).toLocaleTimeString()}</span>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
    </div>
  );
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  placeholder,
  loading,
  disabled,
  sendLabel = "Senden"
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  loading?: boolean;
  disabled?: boolean;
  sendLabel?: string;
}) {
  const blocked = loading || disabled;
  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:gap-3 sm:pt-5">
      <TextInput
        className="min-w-0 flex-1 py-3 text-base sm:py-3.5 sm:text-lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={blocked}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !blocked) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <PrimaryButton
        className="w-full shrink-0 sm:w-auto"
        onClick={onSend}
        loading={loading}
        disabled={disabled}
      >
        {sendLabel}
      </PrimaryButton>
    </div>
  );
}

export function OnlineDot({ online }: { online?: boolean }) {
  return (
    <span
      className={`mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full ring-2 ring-black/20 ${
        online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-white/25"
      }`}
      title={online ? "Online" : "Offline"}
    />
  );
}
