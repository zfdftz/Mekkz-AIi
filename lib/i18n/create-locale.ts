import type { MessageTable } from "./types";

/** Merge partial locale onto English base — every key must eventually be overridden for full UI translation. */
export function createLocale(base: MessageTable, overrides: Partial<MessageTable>): MessageTable {
  return { ...base, ...overrides };
}
