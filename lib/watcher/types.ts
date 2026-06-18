export type WatcherLocale = "de" | "en";

export type WatcherContext = {
  messageCount: number;
  conversationCount: number;
  messagesInCurrentChat: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
  isGuest: boolean;
  username?: string;
  lastMessagePreview?: string;
  lastMessageWasUser?: boolean;
  hasPendingImage: boolean;
  isVoiceMode: boolean;
  isLateNight: boolean;
  isEarlyMorning: boolean;
};

export type WatcherBanks = {
  openings: readonly string[];
  observations: readonly string[];
  verbs: readonly string[];
  objects: readonly string[];
  places: readonly string[];
  moods: readonly string[];
  closings: readonly string[];
  whispers: readonly string[];
  peculiarities: readonly string[];
  pauses: readonly string[];
  watchers: readonly string[];
  durations: readonly string[];
  numbers: readonly string[];
};

export type WatcherActivityLine = {
  weight: number;
  when: (ctx: WatcherContext) => boolean;
  de: (ctx: WatcherContext) => string;
  en: (ctx: WatcherContext) => string;
};
