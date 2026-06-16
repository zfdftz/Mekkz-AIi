"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`community-panel rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 shadow-lg shadow-black/20 backdrop-blur-md sm:p-5 ${className}`}
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
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
    </div>
  );
}

export function ChatLayout({
  sidebar,
  main,
  sidebarTitle
}: {
  sidebar: ReactNode;
  main: ReactNode;
  sidebarTitle?: string;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
      <Panel className="flex max-h-[72vh] flex-col overflow-hidden">
        {sidebarTitle ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{sidebarTitle}</p>
        ) : null}
        {sidebar}
      </Panel>
      <Panel className="flex max-h-[72vh] flex-col overflow-hidden">{main}</Panel>
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
      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
        active ? "community-nav-active shadow-md" : "hover:bg-white/8"
      }`}
    >
      <div className="flex items-start gap-2">
        {leading}
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          {subtitle ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{subtitle}</p> : null}
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
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "border border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            {Icon ? <Icon size={14} /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function LoadingState({ label = "Laden…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {message}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{children}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 ${props.className ?? ""}`}
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
      className={`rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-50 ${props.className ?? ""}`}
    >
      {loading ? <Loader2 size={14} className="mx-auto animate-spin" /> : children}
    </button>
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50 ${props.className ?? ""}`}
    >
      {props.children}
    </button>
  );
}

export function MessageBubble({
  author,
  content,
  highlight,
  time
}: {
  author: string;
  content: string;
  highlight?: boolean;
  time?: string;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
        highlight
          ? "border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5"
          : "border border-white/5 bg-black/20"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-semibold text-primary">{author}</span>
        {time ? (
          <span className="text-[10px] text-muted">{new Date(time).toLocaleTimeString()}</span>
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
  loading
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  loading?: boolean;
}) {
  return (
    <div className="flex gap-2 border-t border-white/10 pt-3">
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <PrimaryButton onClick={onSend} loading={loading}>
        Senden
      </PrimaryButton>
    </div>
  );
}

export function OnlineDot({ online }: { online?: boolean }) {
  return (
    <span
      className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-black/20 ${
        online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-white/25"
      }`}
      title={online ? "Online" : "Offline"}
    />
  );
}
