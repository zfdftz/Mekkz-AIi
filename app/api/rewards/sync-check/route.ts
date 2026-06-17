import { NextResponse } from "next/server";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { listUserBadges } from "@/lib/rewards/badges";
import { getUnlockedTitles } from "@/lib/rewards/cosmetics";
import { getTitle } from "@/lib/rewards/catalog";
import { syncUserRewards } from "@/lib/rewards/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const userId = auth.user!.id;

  const beforeBadges = await listUserBadges(admin, userId);
  const beforeIds = new Set(beforeBadges.map((b) => b.id));

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const registeredAt = authUser?.user?.created_at
    ? new Date(authUser.user.created_at)
    : new Date();
  const titlesBefore = new Set(await getUnlockedTitles(admin, userId, registeredAt));

  await syncUserRewards(admin, userId, auth.user!.email, registeredAt, true);

  const afterBadges = await listUserBadges(admin, userId);
  const titlesAfter = await getUnlockedTitles(admin, userId, registeredAt);

  const newBadges = afterBadges
    .filter((b) => !beforeIds.has(b.id))
    .map((b) => ({ id: b.id, name: b.name, icon: b.icon, type: "badge" as const }));

  const newTitles = titlesAfter
    .filter((id) => !titlesBefore.has(id))
    .map((id) => ({
      id,
      name: getTitle(id)?.label ?? id,
      icon: "🏷️",
      type: "title" as const
    }));

  return NextResponse.json({
    newUnlocks: [...newBadges, ...newTitles],
    badgeCount: afterBadges.length
  });
}
