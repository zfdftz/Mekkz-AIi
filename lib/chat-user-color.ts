const USER_CHAT_COLORS = [
  {
    bubble: "border-violet-400/35 bg-gradient-to-br from-violet-500/30 to-violet-900/15",
    name: "text-violet-200"
  },
  {
    bubble: "border-cyan-400/35 bg-gradient-to-br from-cyan-500/28 to-cyan-900/12",
    name: "text-cyan-200"
  },
  {
    bubble: "border-emerald-400/35 bg-gradient-to-br from-emerald-500/28 to-emerald-900/12",
    name: "text-emerald-200"
  },
  {
    bubble: "border-amber-400/35 bg-gradient-to-br from-amber-500/28 to-amber-900/12",
    name: "text-amber-200"
  },
  {
    bubble: "border-rose-400/35 bg-gradient-to-br from-rose-500/28 to-rose-900/12",
    name: "text-rose-200"
  },
  {
    bubble: "border-indigo-400/35 bg-gradient-to-br from-indigo-500/28 to-indigo-900/12",
    name: "text-indigo-200"
  },
  {
    bubble: "border-orange-400/35 bg-gradient-to-br from-orange-500/28 to-orange-900/12",
    name: "text-orange-200"
  },
  {
    bubble: "border-teal-400/35 bg-gradient-to-br from-teal-500/28 to-teal-900/12",
    name: "text-teal-200"
  },
  {
    bubble: "border-fuchsia-400/35 bg-gradient-to-br from-fuchsia-500/28 to-fuchsia-900/12",
    name: "text-fuchsia-200"
  },
  {
    bubble: "border-sky-400/35 bg-gradient-to-br from-sky-500/28 to-sky-900/12",
    name: "text-sky-200"
  }
] as const;

export function getChatUserColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return USER_CHAT_COLORS[hash % USER_CHAT_COLORS.length];
}

export function chatMessagesScrollKey(messages: { id: string }[]) {
  if (messages.length === 0) return "empty";
  const last = messages[messages.length - 1];
  return `${messages.length}:${last.id}`;
}
