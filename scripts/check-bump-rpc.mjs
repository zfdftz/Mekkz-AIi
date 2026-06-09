import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
    // optional
  }
}

loadEnv(".env.local");
loadEnv(".env.vercel.tmp");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("missing supabase env");
  process.exit(1);
}

const admin = createClient(url, key);
const testId = "00000000-0000-4000-8000-000000000001";
const { data, error } = await admin.rpc("bump_user_plan_usage", {
  p_user_id: testId,
  p_field: "images"
});

if (error) {
  console.log("rpc_status=missing");
  console.log(`rpc_error=${error.message.slice(0, 160)}`);
  process.exit(2);
}

console.log("rpc_status=ok");
console.log(
  `sample=${JSON.stringify({
    plan: data?.plan,
    images_today: data?.images_today,
    uploads_today: data?.uploads_today
  })}`
);
