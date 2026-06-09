import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import pg from "pg";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function migrationSql() {
  return readFileSync(
    resolve(process.cwd(), "supabase/migration-bump-plan-usage.sql"),
    "utf8"
  );
}

export async function POST(req: Request) {
  const secret = process.env.MEKKZ_MIGRATION_SECRET?.trim();
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const dbUrl =
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();

  if (!dbUrl) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_DB_URL fehlt in Vercel. Supabase -> Settings -> Database -> Connection string (URI) eintragen."
      },
      { status: 500 }
    );
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(migrationSql());
    const { rows } = await client.query<{ proname: string }>(
      "select proname from pg_proc where proname = 'bump_user_plan_usage'"
    );
    if (!rows.length) {
      return NextResponse.json(
        { error: "Funktion wurde nicht angelegt." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, function: "bump_user_plan_usage" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.end();
  }
}
