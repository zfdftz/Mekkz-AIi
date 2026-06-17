import { NextResponse } from "next/server";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { globalSearch } from "@/lib/hub/search";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const admin = createAdminClient();
  const results = await globalSearch(admin, auth.user!.id, q);
  return NextResponse.json({ results });
}
