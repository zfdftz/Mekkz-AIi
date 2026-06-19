import type { SupabaseClient } from "@supabase/supabase-js";
import { getLimitedItem, type LimitedItemDef } from "./limited-catalog";

function missing(msg: string) {
  return /relation|does not exist|Could not find|schema cache/i.test(msg);
}

export async function addLimitedToInventory(
  admin: SupabaseClient,
  userId: string,
  itemId: string
) {
  const item = getLimitedItem(itemId);
  if (!item) throw new Error("Limited Item nicht gefunden.");

  const { error } = await admin.from("user_inventory").upsert(
    {
      user_id: userId,
      item_id: item.id,
      item_type: item.type === "crown" ? "frame" : item.type === "decoration" ? "background" : item.type,
      rarity: "legendary",
      season_index: item.seasonIndex ?? -1,
      is_limited: true,
      limited_rarity: item.limitedRarity,
      released_at: item.releasedAt
    },
    { onConflict: "user_id,item_id" }
  );
  if (error && !missing(error.message)) throw new Error(error.message);
  return item;
}

export type InventoryLimitedItem = LimitedItemDef & {
  acquiredAt: string;
  legacy?: boolean;
};

export async function listLimitedInventory(
  admin: SupabaseClient,
  userId: string
): Promise<InventoryLimitedItem[]> {
  const { data, error } = await admin
    .from("user_inventory")
    .select("*")
    .eq("user_id", userId)
    .eq("is_limited", true)
    .order("acquired_at", { ascending: false });
  if (error) {
    if (missing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? [])
    .map((row) => {
      const def = getLimitedItem(row.item_id as string);
      if (!def) return null;
      return {
        ...def,
        acquiredAt: row.acquired_at as string
      };
    })
    .filter(Boolean) as InventoryLimitedItem[];
}
