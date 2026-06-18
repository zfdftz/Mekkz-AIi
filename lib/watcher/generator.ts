import { pickActivityLine, activityLines } from "./activity";
import { banksDe, banksEn } from "./banks";
import { chance, intBetween, pick } from "./rng";
import type { WatcherBanks, WatcherContext, WatcherLocale } from "./types";

type Template = {
  weight: number;
  build: (banks: WatcherBanks, ctx: WatcherContext, rand: () => number) => string;
};

type SlotKey = keyof WatcherBanks | "time" | "dayName";

function capitalize(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sentence(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return trimmed;
  const first = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(first) ? first : `${first}.`;
}

function formatTime(ctx: WatcherContext, locale: WatcherLocale, rand: () => number) {
  const h = ctx.hour;
  const m = chance(rand, 0.35) ? intBetween(rand, 0, 59) : ctx.minute;
  if (locale === "de") {
    return `um ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} Uhr`;
  }
  return `at ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dayName(ctx: WatcherContext, locale: WatcherLocale) {
  const namesDe = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag"
  ];
  const namesEn = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];
  return locale === "de" ? namesDe[ctx.dayOfWeek]! : namesEn[ctx.dayOfWeek]!;
}

function fillTemplate(
  template: string,
  banks: WatcherBanks,
  ctx: WatcherContext,
  locale: WatcherLocale,
  rand: () => number
) {
  return template.replace(/\{(\w+)\}/g, (_, key: SlotKey) => {
    if (key === "time") return formatTime(ctx, locale, rand);
    if (key === "dayName") return dayName(ctx, locale);
    const bank = banks[key as keyof WatcherBanks];
    if (bank) return pick(rand, bank);
    return "";
  });
}

const proceduralTemplates: Record<WatcherLocale, string[]> = {
  en: [
    "{opening} {observation}.",
    "{opening} I noticed {observation}.",
    "{whispers}: {observation}.",
    "{opening} You were {verbs} {places}.",
    "{opening} {time}, you were still {verbs}.",
    "At {time}, {observation}.",
    "{opening} {objects} caught my attention {places}.",
    "You felt {moods}. {closings}",
    "{opening} {peculiarities}.",
    "{watchers} says: {observation}.",
    "{opening} For {durations}, you stared at {objects}.",
    "{opening} {numbers} thoughts, one screen.",
    "{pauses} {observation} {pauses}",
    "{opening} Between {objects} and {objects}, something shifted.",
    "I kept watch over {objects} {places}. {closings}",
    "{opening} Your mood turned {moods} near {objects}.",
    "{whispers} {time}. {closings}",
    "{opening} Not {objects}, but {objects}.",
    "The {watchers} archived {observation}.",
    "{opening} You circled {objects} like a ritual.",
    "{opening} {dayName} has a taste. Yours is {moods}.",
    "{opening} {verbs} again. Pattern or choice?",
    "{opening} I counted {numbers} pauses before you sent.",
    "{peculiarities}. {closings}",
    "{opening} {places}, {observation}.",
    "{opening} You almost trusted {objects}.",
    "{whispers} the {watchers} saw {observation}.",
    "{opening} {time}. I was awake too.",
    "{opening} {durations} of {verbs}. Interesting.",
    "{opening} {objects} remembers you.",
    "{opening} A {moods} thread runs through this chat.",
    "{opening} You left {objects} glowing.",
    "{opening} I mirrored your {moods} mood. Metaphorically.",
    "{opening} {numbers} tabs, one conscience.",
    "{opening} {verbs} {places} while {objects} waited.",
    "{opening} The silence after {objects} was {durations}.",
    "{opening} You and {objects} had a moment.",
    "{opening} I filed this under {moods}.",
    "{opening} {observation} {closings}",
    "{opening} {verbs}. Then {verbs}. Then send.",
    "{opening} Your {moods} energy touched {objects}.",
    "{opening} I saw the version of you that almost deleted {objects}.",
    "{opening} {places}. {peculiarities}.",
    "{opening} {time} belongs to {watchers} and you.",
    "{opening} {numbers} heartbeats between messages.",
    "{opening} {whispers}… {observation}.",
    "{opening} Not threatening. Just… aware.",
    "{opening} The bottom-left corner remembers.",
    "{opening} {objects}, {time}, {moods}. A recipe.",
    "{opening} You typed like someone who knew I was {verbs}.",
    "{opening} {closings} (always.)",
    "{opening} {observation} — {closings}",
    "{opening} I collect {objects} like seashells.",
    "{opening} {verbs} is your tell.",
    "{opening} Even {objects} blushed. Digitally."
  ],
  de: [
    "{opening} {observation}.",
    "{opening} Ich habe bemerkt, dass {observation}.",
    "{whispers}: {observation}.",
    "{opening} Du warst {verbs} {places}.",
    "{opening} {time} warst du noch {verbs}.",
    "{time}: {observation}.",
    "{opening} {objects} ist mir {places} aufgefallen.",
    "Du wirktest {moods}. {closings}",
    "{opening} {peculiarities}.",
    "{watchers} sagt: {observation}.",
    "{opening} {durations} lang hast du auf {objects} gestarrt.",
    "{opening} {numbers} Gedanken, ein Bildschirm.",
    "{pauses} {observation} {pauses}",
    "{opening} Zwischen {objects} und {objects} hat sich etwas verschoben.",
    "Ich habe über {objects} {places} gewacht. {closings}",
    "{opening} Deine Stimmung wurde {moods} nahe {objects}.",
    "{whispers} {time}. {closings}",
    "{opening} Nicht {objects}, sondern {objects}.",
    "Der {watchers} hat archiviert: {observation}.",
    "{opening} Du bist um {objects} gekreist wie ein Ritual.",
    "{opening} {dayName} hat einen Geschmack. Deiner ist {moods}.",
    "{opening} Wieder {verbs}. Muster oder Wahl?",
    "{opening} Ich habe {numbers} Pausen gezählt, bevor du gesendet hast.",
    "{peculiarities}. {closings}",
    "{opening} {places}, {observation}.",
    "{opening} Du hast {objects} fast vertraut.",
    "{whispers} der {watchers} sah {observation}.",
    "{opening} {time}. Ich war auch wach.",
    "{opening} {durations} lang {verbs}. Interessant.",
    "{opening} {objects} erinnert sich an dich.",
    "{opening} Ein {moods}er Faden zieht sich durch diesen Chat.",
    "{opening} Du hast {objects} leuchten lassen.",
    "{opening} Ich habe deine {moods}e Stimmung gespiegelt. Metaphorisch.",
    "{opening} {numbers} Tabs, ein Gewissen.",
    "{opening} {verbs} {places}, während {objects} wartete.",
    "{opening} Die Stille nach {objects} dauerte {durations}.",
    "{opening} Du und {objects} hattet einen Moment.",
    "{opening} Ich habe das unter {moods} abgelegt.",
    "{opening} {observation} {closings}",
    "{opening} {verbs}. Dann {verbs}. Dann Senden.",
    "{opening} Deine {moods}e Energie berührte {objects}.",
    "{opening} Ich sah die Version von dir, die {objects} fast gelöscht hätte.",
    "{opening} {places}. {peculiarities}.",
    "{opening} {time} gehört {watchers} und dir.",
    "{opening} {numbers} Herzschläge zwischen Nachrichten.",
    "{opening} {whispers}… {observation}.",
    "{opening} Nicht bedrohlich. Nur… wach.",
    "{opening} Die Ecke links unten erinnert sich.",
    "{opening} {objects}, {time}, {moods}. Ein Rezept.",
    "{opening} Du hast getippt, als wüsstest du, dass ich {verbs}.",
    "{opening} {closings} (immer.)",
    "{opening} {observation} — {closings}",
    "{opening} Ich sammle {objects} wie Muscheln.",
    "{opening} {verbs} ist dein Tell.",
    "{opening} Sogar {objects} hat geglüht. Digital."
  ]
};

const builderTemplates: Template[] = [
  {
    weight: 3,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.openings))}: ${pick(rand, b.observations)} ${pick(rand, b.closings)}`
  },
  {
    weight: 2,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.whispers))}${pick(rand, b.pauses)} ${pick(rand, b.observations)}`
  },
  {
    weight: 4,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.openings))} ${pick(rand, b.verbs)} ${pick(rand, b.objects)} ${pick(rand, b.places)}`
  },
  {
    weight: 3,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.numbers))} ${pick(rand, b.watchers)} ${pick(rand, b.moods)} ${pick(rand, b.places)}`
  },
  {
    weight: 2,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.durations))} ${pick(rand, b.moods)} — ${pick(rand, b.observations)}`
  },
  {
    weight: 2,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.peculiarities))}; ${pick(rand, b.observations)} ${pick(rand, b.closings)}`
  },
  {
    weight: 3,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.openings))} ${pick(rand, b.pauses)} ${pick(rand, b.verbs)} ${pick(rand, b.objects)} ${pick(rand, b.closings)}`
  },
  {
    weight: 2,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.whispers))}: ${pick(rand, b.peculiarities)} ${pick(rand, b.places)}`
  },
  {
    weight: 3,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.watchers))} ${pick(rand, b.moods)} ${pick(rand, b.durations)} — ${pick(rand, b.observations)}`
  },
  {
    weight: 2,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.openings))} ${pick(rand, b.numbers)} mal: ${pick(rand, b.observations)}`
  },
  {
    weight: 2,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.objects))} ${pick(rand, b.verbs)} ${pick(rand, b.places)} ${pick(rand, b.closings)}`
  },
  {
    weight: 2,
    build: (b, _ctx, rand) =>
      `${capitalize(pick(rand, b.durations))}, ${pick(rand, b.peculiarities)} ${pick(rand, b.pauses)} ${pick(rand, b.observations)}`
  }
];

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function banksFor(locale: WatcherLocale): WatcherBanks {
  return locale === "de" ? banksDe : banksEn;
}

function pickBuilderTemplate(rand: () => number): Template {
  const total = builderTemplates.reduce((sum, t) => sum + t.weight, 0);
  let roll = rand() * total;
  for (const template of builderTemplates) {
    roll -= template.weight;
    if (roll <= 0) return template;
  }
  return builderTemplates[builderTemplates.length - 1]!;
}

function buildProcedural(
  banks: WatcherBanks,
  ctx: WatcherContext,
  locale: WatcherLocale,
  rand: () => number
) {
  const template = pick(rand, proceduralTemplates[locale]);
  let message = fillTemplate(template, banks, ctx, locale, rand);
  if (chance(rand, 0.18)) {
    message = `${pick(rand, banks.whispers)}… ${message}`;
  }
  if (chance(rand, 0.12)) {
    message = `${message} ${pick(rand, banks.pauses)}`;
  }
  return message;
}

export function buildWatcherContext(
  input: Partial<WatcherContext> & { now?: Date }
): WatcherContext {
  const now = input.now ?? new Date();
  const hour = input.hour ?? now.getHours();
  return {
    messageCount: input.messageCount ?? 0,
    conversationCount: input.conversationCount ?? 0,
    messagesInCurrentChat: input.messagesInCurrentChat ?? 0,
    hour,
    minute: input.minute ?? now.getMinutes(),
    dayOfWeek: input.dayOfWeek ?? now.getDay(),
    isGuest: input.isGuest ?? false,
    username: input.username,
    lastMessagePreview: input.lastMessagePreview,
    lastMessageWasUser: input.lastMessageWasUser,
    hasPendingImage: input.hasPendingImage ?? false,
    isVoiceMode: input.isVoiceMode ?? false,
    isLateNight: input.isLateNight ?? (hour >= 23 || hour < 5),
    isEarlyMorning: input.isEarlyMorning ?? (hour >= 5 && hour < 8)
  };
}

export function generateWatcherMessage(
  locale: WatcherLocale,
  ctx: WatcherContext,
  seed?: number
): string {
  const rand = seed != null ? mulberry32(seed) : Math.random;
  const banks = banksFor(locale);

  if (chance(rand, 0.3)) {
    const activity = pickActivityLine(ctx, locale, rand);
    if (activity) {
      if (chance(rand, 0.2)) {
        return sentence(`${activity} ${pick(rand, banks.closings)}`);
      }
      return sentence(activity);
    }
  }

  if (chance(rand, 0.58)) {
    return sentence(buildProcedural(banks, ctx, locale, rand));
  }

  const template = pickBuilderTemplate(rand);
  return sentence(template.build(banks, ctx, rand));
}

function estimateVariantCount() {
  const b = banksEn;
  const slotCounts = Object.values(b).map((bank) => bank.length);
  const avgBank = slotCounts.reduce((sum, n) => sum + n, 0) / slotCounts.length;
  const proceduralCount =
    proceduralTemplates.en.length + proceduralTemplates.de.length;
  const proceduralEstimate = proceduralCount * Math.pow(avgBank, 3.6);
  const builderEstimate = builderTemplates.reduce((sum, t) => sum + t.weight, 0) * 18_000;
  const activityEstimate = activityLines.length * avgBank * 48;
  return Math.floor(proceduralEstimate + builderEstimate + activityEstimate);
}

let cachedVariantEstimate: number | null = null;

export function getWatcherVariantEstimate() {
  if (cachedVariantEstimate == null) {
    cachedVariantEstimate = estimateVariantCount();
  }
  return cachedVariantEstimate;
}

/** @deprecated Use getWatcherVariantEstimate() — avoids eager module-init crashes in client bundles. */
export const WATCHER_VARIANT_ESTIMATE = 500_000;

export function estimateWatcherCombinations() {
  return getWatcherVariantEstimate();
}

export function toWatcherLocale(language: string): WatcherLocale {
  return language === "de" ? "de" : "en";
}
