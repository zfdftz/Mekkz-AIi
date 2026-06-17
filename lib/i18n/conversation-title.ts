import { translate } from "./messages";
import { DEFAULT_LANGUAGE, type LanguageCode } from "../languages";

/** Legacy defaults stored in DB before localized titles. */
export const LEGACY_DEFAULT_CONVERSATION_TITLES = new Set([
  "Neuer Chat",
  "New chat",
  "New Chat",
  "Novo chat",
  "Novo Chat",
  "__new__"
]);

export function isDefaultConversationTitle(title: string | null | undefined) {
  if (!title) return true;
  return LEGACY_DEFAULT_CONVERSATION_TITLES.has(title.trim());
}

export function getDefaultConversationTitle(language: LanguageCode = DEFAULT_LANGUAGE) {
  return translate(language, "chat.newChat");
}

export function displayConversationTitle(
  title: string | null | undefined,
  language: LanguageCode
) {
  if (isDefaultConversationTitle(title)) {
    return getDefaultConversationTitle(language);
  }
  return title?.trim() || getDefaultConversationTitle(language);
}
