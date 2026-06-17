import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import { createProject, listProjects, updateProject } from "@/lib/hub/workspaces";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId") ?? undefined;
  const includeArchived = searchParams.get("archived") === "1";

  const admin = createAdminClient();
  const projects = await listProjects(admin, auth.user!.id, workspaceId, includeArchived);
  return NextResponse.json({ projects });
}

const schema = z.object({
  action: z.enum(["create", "update", "archive"]),
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional()
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
    if (parsed.data.action === "create") {
      if (!parsed.data.workspaceId || !parsed.data.name) {
        return NextResponse.json({ error: "workspaceId und name erforderlich." }, { status: 400 });
      }
      const project = await createProject(admin, userId, {
        workspaceId: parsed.data.workspaceId,
        name: parsed.data.name,
        description: parsed.data.description
      });
      return NextResponse.json({ project });
    }

    if (!parsed.data.projectId) {
      return NextResponse.json({ error: "projectId fehlt." }, { status: 400 });
    }

    const project = await updateProject(admin, userId, parsed.data.projectId, {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.description != null ? { description: parsed.data.description } : {}),
      ...(parsed.data.action === "archive" ? { status: "archived" as const } : {})
    });
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 400 }
    );
  }
}
