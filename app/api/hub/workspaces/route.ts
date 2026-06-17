import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  createWorkspace,
  joinWorkspace,
  listProjects,
  listWorkspaces
} from "@/lib/hub/workspaces";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const includeProjects = searchParams.get("projects") === "1";
  const workspaceId = searchParams.get("workspaceId") ?? undefined;

  const admin = createAdminClient();
  const userId = auth.user!.id;
  const workspaces = await listWorkspaces(admin, userId);
  const projects = includeProjects ? await listProjects(admin, userId, workspaceId) : [];

  return NextResponse.json({ workspaces, projects });
}

const schema = z.object({
  action: z.enum(["create", "join"]),
  name: z.string().min(1).max(80).optional(),
  workspaceType: z.enum(["personal", "team", "school", "business"]).optional(),
  description: z.string().max(500).optional(),
  workspaceId: z.string().uuid().optional()
});

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const admin = createAdminClient();
  const userId = auth.user!.id;

  try {
    if (parsed.data.action === "join") {
      if (!parsed.data.workspaceId) {
        return NextResponse.json({ error: "workspaceId fehlt." }, { status: 400 });
      }
      await joinWorkspace(admin, userId, parsed.data.workspaceId);
      return NextResponse.json({ ok: true });
    }

    const workspace = await createWorkspace(admin, userId, {
      name: parsed.data.name ?? "Neuer Workspace",
      workspaceType: parsed.data.workspaceType ?? "team",
      description: parsed.data.description
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 400 }
    );
  }
}
