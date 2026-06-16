"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm ${className}`}>
      {children}
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
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs uppercase tracking-wide text-muted">{children}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-primary/50 ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-primary/50 ${props.className ?? ""}`}
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
      className={`rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 ${props.className ?? ""}`}
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
      className={`rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50 ${props.className ?? ""}`}
    />
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
      className={`rounded-xl px-3 py-2 text-sm ${
        highlight ? "border border-primary/30 bg-primary/15" : "bg-white/8"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium text-primary">{author}</span>
        {time ? (
          <span className="text-[10px] text-muted">{new Date(time).toLocaleTimeString()}</span>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap break-words">{content}</p>
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
    <div className="flex gap-2">
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
      className={`inline-block h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-white/30"}`}
      title={online ? "Online" : "Offline"}
    />
  );
}
