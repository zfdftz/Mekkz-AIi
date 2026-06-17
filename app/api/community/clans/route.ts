import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  createClan,
  getUserClan,
  isClansSchemaMissing,
  joinPublicClan,
  listClanMembers,
  listClanMessages,
  listPublicClans,
  postClanMessage,
  requestJoinClan
} from "@/lib/community/clans";
import { createAdminClient } from "@/lib/supabase/admin";

function mapClanError(error: unknown) {
  const msg = error instanceof Error ? error.message : "Fehler.";
  if (isClansSchemaMissing(msg)) {
    return NextResponse.json(
      {
        error:
          "Clans sind noch nicht eingerichtet. Bitte supabase/migration-clans.sql ausführen (npm run migrate:clans)."
      },
      { status: 503 }
    );
  }
  const status = /bereits in einem Clan|privat|Ungültig|Mitglieder/i.test(msg) ? 400 : 500;
  return NextResponse.json({ error: msg }, { status });
}

export async function GET() {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;

  try {
    const admin = createAdminClient();
    const [clans, myClan] = await Promise.all([
      listPublicClans(admin),
      getUserClan(admin, auth.user!.id)
    ]);
    let members: Awaited<ReturnType<typeof listClanMembers>> = [];
    let messages: Awaited<ReturnType<typeof listClanMessages>> = [];
    if (myClan) {
      [members, messages] = await Promise.all([
        listClanMembers(admin, myClan.id),
        listClanMessages(admin, myClan.id)
      ]);
    }
    return NextResponse.json({ clans, myClan, members, messages });
  } catch (error) {
    return mapClanError(error);
  }
}

const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().min(3).max(32),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional()
});

const joinSchema = z.object({
  action: z.enum(["join", "request"]),
  clanId: z.string().uuid()
});

const messageSchema = z.object({
  action: z.literal("message"),
  content: z.string().min(1).max(4000)
});

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;

  try {
    const admin = createAdminClient();
    const body = await req.json();

    const createParsed = createSchema.safeParse(body);
    if (createParsed.success) {
      const existing = await getUserClan(admin, auth.user!.id);
      if (existing) {
        return NextResponse.json({ error: "Du bist bereits in einem Clan." }, { status: 400 });
      }
      const clan = await createClan(
        admin,
        auth.user!.id,
        createParsed.data.name,
        createParsed.data.description ?? "",
        createParsed.data.isPublic ?? true
      );
      return NextResponse.json({ clan });
    }

    const joinParsed = joinSchema.safeParse(body);
    if (joinParsed.success) {
      if (joinParsed.data.action === "join") {
        await joinPublicClan(admin, auth.user!.id, joinParsed.data.clanId);
      } else {
        await requestJoinClan(admin, auth.user!.id, joinParsed.data.clanId);
      }
      return NextResponse.json({ ok: true });
    }

    const messageParsed = messageSchema.safeParse(body);
    if (messageParsed.success) {
      const myClan = await getUserClan(admin, auth.user!.id);
      if (!myClan) {
        return NextResponse.json({ error: "Du bist in keinem Clan." }, { status: 400 });
      }
      const message = await postClanMessage(
        admin,
        auth.user!.id,
        myClan.id,
        messageParsed.data.content
      );
      return NextResponse.json({ message });
    }

    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  } catch (error) {
    return mapClanError(error);
  }
}
