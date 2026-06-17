import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { updateShowcasedBadges } from "@/lib/rewards/badges";
import {
  getCrateState,
  getProfileCosmetics,
  getUnlockedTitles,
  listInventory,
  openDailyCrate,
  updateProfileCosmetics
} from "@/lib/rewards/cosmetics";
import { getFullRewardsProfile } from "@/lib/rewards/identity";
import { syncUserRewards } from "@/lib/rewards/sync";
import { formatSeasonCountdown, getCurrentSeasonInfo } from "@/lib/rewards/seasons";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const userId = auth.user!.id;

  await syncUserRewards(admin, userId, auth.user!.email);
  const [rewards, inventory, crate, titles, season] = await Promise.all([
    getFullRewardsProfile(admin, userId),
    listInventory(admin, userId),
    getCrateState(admin, userId),
    getUnlockedTitles(admin, userId, new Date(auth.user!.created_at ?? Date.now())),
    Promise.resolve(getCurrentSeasonInfo())
  ]);

  return NextResponse.json({
    ...rewards,
    inventory,
    crate,
    unlockedTitles: titles,
    season: {
      ...season,
      countdownLabel: formatSeasonCountdown(season.daysUntilNext, season.nextSeason.name)
    }
  });
}

const patchSchema = z.object({
  bannerUrl: z.string().nullable().optional(),
  profileFrame: z.string().nullable().optional(),
  profileBackground: z.string().nullable().optional(),
  accentColor: z.string().max(32).optional(),
  activeTitle: z.string().nullable().optional(),
  animatedAvatar: z.boolean().optional(),
  showcasedBadgeIds: z.array(z.string()).optional()
});

export async function PATCH(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const admin = createAdminClient();
  const userId = auth.user!.id;

  if (parsed.data.showcasedBadgeIds) {
    await updateShowcasedBadges(admin, userId, parsed.data.showcasedBadgeIds);
  }

  const cosmetics = await updateProfileCosmetics(admin, userId, parsed.data);
  return NextResponse.json({ cosmetics });
}

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  if (body.action !== "open-crate") {
    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    const result = await openDailyCrate(admin, auth.user!.id);
    const crate = await getCrateState(admin, auth.user!.id);
    return NextResponse.json({ ...result, crate });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 400 }
    );
  }
}
