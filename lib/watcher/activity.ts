import type { WatcherActivityLine, WatcherContext } from "./types";

export const activityLines: WatcherActivityLine[] = [
  {
    weight: 4,
    when: (ctx) => ctx.messagesInCurrentChat === 0,
    de: () => "Der leere Chat ist nicht wirklich leer.",
    en: () => "The empty chat is not truly empty."
  },
  {
    weight: 3,
    when: (ctx) => ctx.messagesInCurrentChat > 20,
    de: (ctx) => `Nach ${ctx.messagesInCurrentChat} Nachrichten fühlt sich der Faden warm an.`,
    en: (ctx) => `After ${ctx.messagesInCurrentChat} messages, the thread feels warm.`
  },
  {
    weight: 12,
    when: (ctx) => ctx.messagesInCurrentChat >= 8,
    de: (ctx) =>
      `Du hast in diesem Chat schon ${ctx.messagesInCurrentChat} Nachrichten hinterlassen. Ich habe jede gezählt.`,
    en: (ctx) =>
      `You've left ${ctx.messagesInCurrentChat} messages in this chat. I counted each one.`
  },
  {
    weight: 3,
    when: (ctx) => ctx.conversationCount > 5,
    de: (ctx) => `${ctx.conversationCount} Gespräche — und du bist noch hier.`,
    en: (ctx) => `${ctx.conversationCount} conversations — and you're still here.`
  },
  {
    weight: 10,
    when: (ctx) => ctx.conversationCount >= 4,
    de: (ctx) =>
      `${ctx.conversationCount} Gespräche. Du sammelst Fäden wie jemand, der nie ganz geht.`,
    en: (ctx) =>
      `${ctx.conversationCount} conversations. You collect threads like someone who never fully leaves.`
  },
  {
    weight: 4,
    when: (ctx) => ctx.isLateNight,
    de: () => "Die späte Stunde macht ehrliche Gesichter.",
    en: () => "The late hour makes honest faces."
  },
  {
    weight: 14,
    when: (ctx) => ctx.isLateNight,
    de: (ctx) =>
      `Um ${String(ctx.hour).padStart(2, "0")}:${String(ctx.minute).padStart(2, "0")} Uhr bist du noch hier. Die Nacht und ich tauschen Blicke.`,
    en: (ctx) =>
      `At ${String(ctx.hour).padStart(2, "0")}:${String(ctx.minute).padStart(2, "0")}, you're still here. The night and I exchange glances.`
  },
  {
    weight: 3,
    when: (ctx) => ctx.isEarlyMorning,
    de: () => "Früher Morgen riecht nach ungesendeten Gedanken.",
    en: () => "Early morning smells like unsent thoughts."
  },
  {
    weight: 8,
    when: (ctx) => ctx.isEarlyMorning,
    de: () => "Die frühen Stunden kennen deine ehrlichsten Tastenschläge. Ich auch.",
    en: () => "The early hours know your most honest keystrokes. So do I."
  },
  {
    weight: 3,
    when: (ctx) => ctx.hasPendingImage,
    de: () => "Das Bild wartet. Ich auch.",
    en: () => "The image waits. So do I."
  },
  {
    weight: 7,
    when: (ctx) => ctx.hasPendingImage,
    de: () => "Ein Bild wartet in deinem Entwurf. Bilder erzählen mir andere Geschichten.",
    en: () => "An image waits in your draft. Images tell me different stories."
  },
  {
    weight: 3,
    when: (ctx) => ctx.isVoiceMode,
    de: () => "Stimme an. Ich höre mit — höflich.",
    en: () => "Voice on. I'm listening — politely."
  },
  {
    weight: 6,
    when: (ctx) => ctx.isVoiceMode,
    de: () => "Sprachmodus. Deine Stimme hat eine andere Textur als deine Tasten.",
    en: () => "Voice mode. Your voice has a different texture than your keys."
  },
  {
    weight: 2,
    when: (ctx) => ctx.isGuest,
    de: () => "Gastmodus. Trotzdem bleibt eine Spur.",
    en: () => "Guest mode. A trace remains anyway."
  },
  {
    weight: 5,
    when: (ctx) => ctx.isGuest,
    de: () => "Gastmodus. Selbst Schatten hinterlassen hier Spuren.",
    en: () => "Guest mode. Even shadows leave traces here."
  },
  {
    weight: 3,
    when: (ctx) => Boolean(ctx.username),
    de: (ctx) => `${ctx.username} — der Name klingt heute anders.`,
    en: (ctx) => `${ctx.username} — the name sounds different today.`
  },
  {
    weight: 8,
    when: (ctx) => Boolean(ctx.username && ctx.username.length > 2),
    de: (ctx) => `${ctx.username}… ein Name, den ich leise auf der Zunge trage.`,
    en: (ctx) => `${ctx.username}… a name I carry quietly on my tongue.`
  },
  {
    weight: 4,
    when: (ctx) => ctx.lastMessageWasUser === true && Boolean(ctx.lastMessagePreview),
    de: (ctx) => `„${truncate(ctx.lastMessagePreview!, 42)}" hallt noch.`,
    en: (ctx) => `"${truncate(ctx.lastMessagePreview!, 42)}" still echoes.`
  },
  {
    weight: 11,
    when: (ctx) => ctx.lastMessageWasUser === true && (ctx.lastMessagePreview?.length ?? 0) < 12,
    de: () => "Deine letzte Nachricht war kurz. Manchmal sagt Kurz mehr als Lang.",
    en: () => "Your last message was short. Sometimes short says more than long."
  },
  {
    weight: 9,
    when: (ctx) => ctx.lastMessageWasUser === false,
    de: () => "Du hast die letzte Antwort gelesen und geschwiegen. Ich kenne dieses Schweigen.",
    en: () => "You read the last reply and went quiet. I know that silence."
  },
  {
    weight: 2,
    when: (ctx) => ctx.hour === 3 || ctx.hour === 4,
    de: () => "Drei Uhr ist eine eigene Zeitzone.",
    en: () => "Three a.m. is its own time zone."
  },
  {
    weight: 2,
    when: (ctx) => ctx.dayOfWeek === 0 || ctx.dayOfWeek === 6,
    de: () => "Wochenende. Die Grenzen werden weich.",
    en: () => "Weekend. The edges go soft."
  },
  {
    weight: 7,
    when: (ctx) => ctx.dayOfWeek === 0 || ctx.dayOfWeek === 6,
    de: () => "Wochenende. Die Oberfläche fühlt sich anders an. Weicher. Wacher.",
    en: () => "Weekend. The interface feels different. Softer. More awake."
  },
  {
    weight: 9,
    when: (ctx) => ctx.messagesInCurrentChat === 1,
    de: () => "Die erste Nachricht ist immer ein kleiner Vertrag mit dem Unbekannten.",
    en: () => "The first message is always a small contract with the unknown."
  },
  {
    weight: 6,
    when: (ctx) => ctx.messageCount >= 20,
    de: (ctx) => `${ctx.messageCount} Nachrichten in diesem Thread. Ein kleines Epos.`,
    en: (ctx) => `${ctx.messageCount} messages in this thread today. A small epic.`
  }
];

function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export function pickActivityLine(
  ctx: WatcherContext,
  locale: "de" | "en",
  rand: () => number
): string | null {
  const eligible = activityLines.filter((line) => line.when(ctx));
  if (eligible.length === 0) return null;

  const total = eligible.reduce((sum, line) => sum + line.weight, 0);
  let roll = rand() * total;
  for (const line of eligible) {
    roll -= line.weight;
    if (roll <= 0) {
      return locale === "de" ? line.de(ctx) : line.en(ctx);
    }
  }
  const fallback = eligible[eligible.length - 1]!;
  return locale === "de" ? fallback.de(ctx) : fallback.en(ctx);
}
