import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRegisteredUser } from "@/lib/api/require-user";
import {
  createFolder,
  deleteFile,
  extractTextContent,
  listFiles,
  listFolders,
  renameFile,
  uploadFileRecord
} from "@/lib/hub/files";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");

  const admin = createAdminClient();
  const files = await listFiles(admin, auth.user!.id, folderId);
  const folders = await listFolders(admin, auth.user!.id);
  return NextResponse.json({ files, folders });
}

const schema = z.object({
  action: z.enum(["upload-meta", "rename", "delete", "create-folder"]),
  fileId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255).optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
  contentText: z.string().nullable().optional(),
  parentId: z.string().uuid().optional().nullable()
});

export async function POST(req: Request) {
  const auth = await requireRegisteredUser();
  if (auth.error) return auth.error;
  const contentType = req.headers.get("content-type") ?? "";
  const admin = createAdminClient();
  const userId = auth.user!.id;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Keine Datei." }, { status: 400 });
    }
    const contentText = await extractTextContent(file);
    const record = await uploadFileRecord(admin, userId, {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      contentText,
      folderId: (form.get("folderId") as string) || null
    });
    return NextResponse.json({ file: record });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "create-folder") {
      if (!parsed.data.name) {
        return NextResponse.json({ error: "Name fehlt." }, { status: 400 });
      }
      const folder = await createFolder(admin, userId, {
        name: parsed.data.name,
        parentId: parsed.data.parentId
      });
      return NextResponse.json({ folder });
    }
    if (parsed.data.action === "upload-meta") {
      if (!parsed.data.name) {
        return NextResponse.json({ error: "Name fehlt." }, { status: 400 });
      }
      const file = await uploadFileRecord(admin, userId, {
        name: parsed.data.name,
        mimeType: parsed.data.mimeType ?? "text/plain",
        sizeBytes: parsed.data.sizeBytes ?? 0,
        contentText: parsed.data.contentText,
        folderId: parsed.data.folderId
      });
      return NextResponse.json({ file });
    }
    if (parsed.data.action === "rename") {
      if (!parsed.data.fileId || !parsed.data.name) {
        return NextResponse.json({ error: "fileId und name erforderlich." }, { status: 400 });
      }
      const file = await renameFile(admin, userId, parsed.data.fileId, parsed.data.name);
      return NextResponse.json({ file });
    }
    if (parsed.data.action === "delete") {
      if (!parsed.data.fileId) {
        return NextResponse.json({ error: "fileId fehlt." }, { status: 400 });
      }
      await deleteFile(admin, userId, parsed.data.fileId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fehler." },
      { status: 400 }
    );
  }
}
