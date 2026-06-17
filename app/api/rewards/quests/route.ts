import { NextResponse } from "next/server";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { listUserBadges } from "@/lib/rewards/badges";
import { getTitle, TITLES } from "@/lib/rewards/catalog";
import { getUnlockedTitles } from "@/lib/rewards/cosmetics";
import { QUESTS, getVisibleRequirement } from "@/lib/rewards/quest-catalog";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const userId = auth.user!.id;

  const [badges, { data: authUser }] = await Promise.all([
    listUserBadges(admin, userId),
    admin.auth.admin.getUserById(userId)
  ]);
  const owned = new Set(badges.map((b) => b.id));
  const registeredAt = authUser?.user?.created_at
    ? new Date(authUser.user.created_at)
    : new Date();
  const unlockedTitles = await getUnlockedTitles(admin, userId, registeredAt);

  const quests = Object.values(QUESTS).map((q) => ({
    id: q.id,
    name: q.name,
    description: q.description,
    icon: q.icon,
    category: q.category,
    requirement: getVisibleRequirement(q, owned.has(q.id)),
    secret: Boolean(q.secret),
    unlocked: owned.has(q.id),
    titleId: q.titleId ?? null
  }));

  const titles = Object.values(TITLES).map((t) => ({
    id: t.id,
    label: t.label,
    unlocked: unlockedTitles.includes(t.id)
  }));

  return NextResponse.json({ quests, titles, ownedBadgeIds: [...owned] });
}
