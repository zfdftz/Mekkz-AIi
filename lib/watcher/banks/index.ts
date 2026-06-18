import type { LanguageCode } from "@/lib/languages";
import type { WatcherBanks, WatcherLocale } from "../types";
import { deBanks } from "./de";
import { enBanks } from "./en";

export function resolveWatcherLocale(language: LanguageCode): WatcherLocale {
  return language === "de" ? "de" : "en";
}

export function getWatcherBanks(locale: WatcherLocale): WatcherBanks {
  return locale === "de" ? deBanks : enBanks;
}

export { deBanks, enBanks };
