"use client";

type ChatTypingIndicatorProps = {
  label: string;
};

export function ChatTypingIndicator({ label }: ChatTypingIndicatorProps) {
  return (
    <div className="chat-typing-indicator flex items-center gap-2.5 py-0.5 text-sm text-muted">
      <span className="chat-typing-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span>{label}</span>
    </div>
  );
}
