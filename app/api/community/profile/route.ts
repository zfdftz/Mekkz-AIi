import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  AVATAR_MAX_BYTES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH
} from "@/lib/community/profile-rules";
import { fetchOwnProfile } from "@/lib/community/own-profile";
import { updateProfile } from "@/lib/community/profile";
import { getFollowerCounts, getTotalLikes } from "@/lib/community/public-profile";
import { getAuthorIdentity } from "@/lib/rewards/identity";
import { updateShowcasedBadges } from "@/lib/rewards/badges";
import { getProfileCosmetics, updateProfileCosmetics } from "@/lib/rewards/cosmetics";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const profile = await fetchOwnProfile(admin, auth.user!.id, auth.user!.email);
  return NextResponse.json({ profile });
}

const avatarSchema = z
  .string()
  .refine(
    (value) => value.startsWith("data:image/") || /^https?:\/\//i.test(value),
    "Ungültige Avatar-URL."
  )
  .refine((value) => {
    if (!value.startsWith("data:")) return true;
    const base64 = value.split(",")[1];
    if (!base64) return false;
    const bytes = Math.ceil((base64.length * 3) / 4);
    return bytes <= AVATAR_MAX_BYTES;
  }, `Avatar max. ${Math.round(AVATAR_MAX_BYTES / (1024 * 1024))} MB.`);

const patchSchema = z.object({
  username: z
    .string()
    .min(USERNAME_MIN_LENGTH, `Mindestens ${USERNAME_MIN_LENGTH} Zeichen.`)
    .max(USERNAME_MAX_LENGTH)
    .regex(/^[\w.-]+$/, "Nur Buchstaben, Zahlen, _, . und - erlaubt.")
    .optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.union([avatarSchema, z.null()]).optional(),
  showcasedBadgeIds: z.array(z.string()).optional(),
  profileBackground: z.string().nullable().optional(),
  accentColor: z.string().max(32).optional(),
  activeTitle: z.string().nullable().optional()
});

export async function PATCH(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Ungültige Profildaten.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const admin = createAdminClient();
  try {
    const {
      showcasedBadgeIds,
      profileBackground,
      accentColor,
      activeTitle,
      ...profilePatch
    } = parsed.data;

    const profile = await updateProfile(admin, auth.user!.id, profilePatch);

    if (showcasedBadgeIds) {
      await updateShowcasedBadges(admin, auth.user!.id, showcasedBadgeIds);
    }

    if (
      profileBackground !== undefined ||
      accentColor !== undefined ||
      activeTitle !== undefined
    ) {
      await updateProfileCosmetics(admin, auth.user!.id, {
        profileBackground,
        accentColor,
        activeTitle
      });
    }

    const [counts, identity, cosmetics, totalLikes] = await Promise.all([
      getFollowerCounts(admin, auth.user!.id),
      getAuthorIdentity(admin, auth.user!.id),
      getProfileCosmetics(admin, auth.user!.id),
      getTotalLikes(admin, auth.user!.id)
    ]);

    return NextResponse.json({
      profile: profile
        ? {
            ...profile,
            ...counts,
            isVerified: identity.isVerified,
            isCreator: identity.isCreator,
            isChosen: identity.isChosen,
            isUltraCreator: identity.isUltraCreator,
            activeTitleLabel: identity.titleLabel,
            accentColor: cosmetics.accentColor,
            profileBackground: cosmetics.profileBackground,
            activeTitle: cosmetics.activeTitle,
            totalLikes,
            showcasedBadges: identity.showcasedBadges.map((b) => ({
              id: b.id,
              name: b.name,
              description: b.description,
              icon: b.icon
            }))
          }
        : null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Speichern fehlgeschlagen." },
      { status: 400 }
    );
  }
}
