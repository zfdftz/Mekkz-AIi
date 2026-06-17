"use client";

import { FileText, FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/fetch-json";
import type { HubFile } from "@/lib/hub/types";

export function HubFilesPanel() {
  const [files, setFiles] = useState<HubFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hub/files");
      const data = await readJsonResponse<{ files?: HubFile[] }>(res);
      if (res.ok) setFiles(data.files ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(fileList: FileList | null) {
    if (!fileList?.[0]) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", fileList[0]);
      await fetch("/api/hub/files", { method: "POST", body: form });
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function remove(fileId: string) {
    await fetch("/api/hub/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", fileId })
    });
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-3 text-sm hover:bg-white/10">
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        Datei hochladen
        <input
          type="file"
          className="hidden"
          onChange={(e) => void onUpload(e.target.files)}
        />
      </label>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {files.length === 0 ? (
          <p className="text-center text-xs text-muted">Noch keine Dateien</p>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
            >
              <div className="flex items-start gap-2">
                <FileText size={16} className="mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-[10px] text-muted">{file.mimeType}</p>
                  {file.contentText ? (
                    <p className="mt-1 line-clamp-3 text-xs text-muted">{file.contentText}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(file.id)}
                  className="rounded p-1 text-muted hover:bg-white/10 hover:text-red-300"
                  aria-label="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="flex items-center gap-1 text-[10px] text-muted">
        <FolderOpen size={12} /> PDF, Bilder, Docs, Code & Text — AI kann Inhalte analysieren
      </p>
    </div>
  );
}
