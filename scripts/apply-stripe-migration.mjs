import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional env file
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env.vercel.tmp"));

const sqlPath = resolve(process.cwd(), "supabase/migration-stripe-complete.sql");
const sql = readFileSync(sqlPath, "utf8");

const dbUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error(
    "Fehlt: SUPABASE_DB_URL (oder DATABASE_URL).\n" +
      "Supabase Dashboard -> Project Settings -> Database -> Connection string (URI)\n" +
      "Dann in .env.local z.B.:\n" +
      "SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'user_plans' and column_name like 'stripe_%' order by column_name"
  );
  console.log(
    "OK: Stripe-Spalten in user_plans aktiv:",
    rows.map((row) => row.column_name).join(", ") || "(keine gefunden)"
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await client.end();
}
