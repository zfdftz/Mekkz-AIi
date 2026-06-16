"use client";

import { GripVertical, Sparkles, StickyNote, Trash2, Type } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmptyState,
  FieldLabel,
  GhostButton,
  Panel,
  PrimaryButton,
  SectionHeader,
  TextInput
} from "@/components/community/shared";
import { readJsonResponse } from "@/lib/fetch-json";

type BoardNode = {
  id: string;
  content: string;
  nodeType: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
};

const NODE_STYLES: Record<string, { bg: string; label: string; text: string }> = {
  sticky: {
    bg: "linear-gradient(145deg, rgba(251,191,36,0.95), rgba(217,119,6,0.9))",
    label: "Sticky",
    text: "#1c1917"
  },
  ai: {
    bg: "linear-gradient(145deg, rgba(139,92,246,0.95), rgba(76,29,149,0.92))",
    label: "KI",
    text: "#f5f3ff"
  },
  text: {
    bg: "linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.92))",
    label: "Text",
    text: "#f8fafc"
  }
};

export function BoardTab() {
  const [boards, setBoards] = useState<Array<{ id: string; title: string }>>([]);
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const loadBoards = useCallback(async () => {
    const res = await fetch("/api/productivity?resource=boards");
    const data = await readJsonResponse<{ boards?: typeof boards }>(res);
    if (res.ok) setBoards(data.boards ?? []);
  }, []);

  const loadNodes = useCallback(async (boardId: string) => {
    const res = await fetch(`/api/productivity?resource=board-nodes&boardId=${boardId}`);
    const data = await readJsonResponse<{ nodes?: BoardNode[] }>(res);
    if (res.ok) setNodes(data.nodes ?? []);
  }, []);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  async function persistNode(node: BoardNode) {
    if (!activeBoard) return;
    await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "boards",
        action: "upsert",
        payload: { ...node, boardId: activeBoard }
      })
    });
  }

  async function createBoard() {
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "boards",
        action: "create",
        payload: { title: newTitle || "Brainstorm" }
      })
    });
    const data = await readJsonResponse<{ board?: { id: string }; boards?: typeof boards }>(res);
    if (res.ok) {
      setBoards(data.boards ?? []);
      if (data.board) {
        setActiveBoard(data.board.id);
        setNodes([]);
      }
      setNewTitle("");
    }
  }

  async function addNode(content: string, nodeType: "text" | "sticky" | "ai" = "sticky") {
    if (!activeBoard) return;
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "boards",
        action: "upsert",
        payload: {
          boardId: activeBoard,
          content,
          nodeType,
          posX: 48 + Math.random() * 280,
          posY: 48 + Math.random() * 180,
          width: 240,
          height: 140
        }
      })
    });
    const data = await readJsonResponse<{ nodes?: BoardNode[] }>(res);
    if (res.ok) setNodes(data.nodes ?? []);
  }

  async function suggestIdeas() {
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "boards", action: "suggest", payload: { topic } })
    });
    const data = await readJsonResponse<{ ideas?: string[] }>(res);
    setIdeas(data.ideas ?? []);
  }

  async function deleteNode(nodeId: string) {
    if (!activeBoard) return;
    const res = await fetch("/api/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "boards",
        action: "delete-node",
        payload: { boardId: activeBoard, id: nodeId }
      })
    });
    const data = await readJsonResponse<{ nodes?: BoardNode[] }>(res);
    if (res.ok) setNodes(data.nodes ?? []);
  }

  function updateNodeContent(id: string, content: string) {
    setNodes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, content } : n));
      const node = next.find((n) => n.id === id);
      if (node) void persistNode(node);
      return next;
    });
  }

  function startDrag(e: React.MouseEvent, node: BoardNode) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      id: node.id,
      offsetX: e.clientX - rect.left - node.posX,
      offsetY: e.clientY - rect.top - node.posY
    };
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (!dragRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(8, e.clientX - rect.left - dragRef.current.offsetX);
    const y = Math.max(8, e.clientY - rect.top - dragRef.current.offsetY);
    setNodes((prev) =>
      prev.map((n) => (n.id === dragRef.current!.id ? { ...n, posX: x, posY: y } : n))
    );
  }

  function onCanvasMouseUp() {
    if (!dragRef.current) return;
    const id = dragRef.current.id;
    dragRef.current = null;
    setNodes((prev) => {
      const node = prev.find((n) => n.id === id);
      if (node) void persistNode(node);
      return prev;
    });
  }

  function exportPng() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0014";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const node of nodes) {
      const style = NODE_STYLES[node.nodeType] ?? NODE_STYLES.text;
      ctx.fillStyle = style.bg.includes("251") ? "#ca8a04" : style.bg.includes("139") ? "#6d28d9" : "#1e293b";
      ctx.fillRect(node.posX, node.posY, node.width, node.height);
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      wrapText(ctx, node.content, node.posX + 8, node.posY + 28, node.width - 16);
    }
    const link = document.createElement("a");
    link.download = "brainstorm.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function exportPdf() {
    const html = `<!DOCTYPE html><html><head><title>Brainstorm</title><style>
      body{font-family:Arial;background:#111;color:#eee;padding:24px}
      .node{position:absolute;border-radius:12px;padding:12px;box-sizing:border-box;font-size:14px}
    </style></head><body><h1>Brainstorm Board</h1>
    <div style="position:relative;width:1200px;height:800px;background:#0a0014">
    ${nodes
      .map((n) => {
        const style = NODE_STYLES[n.nodeType] ?? NODE_STYLES.text;
        return `<div class="node" style="left:${n.posX}px;top:${n.posY}px;width:${n.width}px;height:${n.height}px;background:${style.bg};color:${style.text}">${n.content.replace(/</g, "&lt;")}</div>`;
      })
      .join("")}
    </div></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Brainstorm Board"
        description="Sticky Notes verschieben per Griff oben. Text direkt in der Karte bearbeiten — speichert automatisch."
      />

      <Panel className="community-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
            <TextInput
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Neues Board…"
              className="max-w-xs"
            />
            <PrimaryButton onClick={createBoard}>Erstellen</PrimaryButton>
          </div>
          <div className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <GhostButton
                key={b.id}
                className={activeBoard === b.id ? "community-nav-active" : ""}
                onClick={() => {
                  setActiveBoard(b.id);
                  void loadNodes(b.id);
                }}
              >
                {b.title}
              </GhostButton>
            ))}
          </div>
        </div>

        {activeBoard ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <GhostButton onClick={() => addNode("Neue Idee…", "sticky")}>
              <StickyNote size={14} className="mr-1 inline" /> Sticky
            </GhostButton>
            <GhostButton onClick={() => addNode("Textblock…", "text")}>
              <Type size={14} className="mr-1 inline" /> Text
            </GhostButton>
            <TextInput
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Thema für KI-Ideen…"
              className="max-w-[200px]"
            />
            <GhostButton onClick={suggestIdeas}>
              <Sparkles size={14} className="mr-1 inline" /> KI
            </GhostButton>
            <GhostButton onClick={exportPng}>PNG</GhostButton>
            <GhostButton onClick={exportPdf}>PDF</GhostButton>
          </div>
        ) : null}

        {ideas.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {ideas.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => addNode(idea, "ai")}
                className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs transition hover:bg-primary/20"
              >
                + {idea.slice(0, 48)}
              </button>
            ))}
          </div>
        ) : null}
      </Panel>

      {activeBoard ? (
        <div
          ref={canvasRef}
          className="community-canvas relative h-[min(560px,70vh)] overflow-auto rounded-2xl border border-white/10 shadow-inner"
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
        >
          <div className="pointer-events-none absolute inset-0 community-canvas-grid opacity-40" />
          {nodes.map((node) => {
            const style = NODE_STYLES[node.nodeType] ?? NODE_STYLES.text;
            return (
              <div
                key={node.id}
                className="absolute flex flex-col overflow-hidden rounded-xl shadow-xl ring-1 ring-black/20"
                style={{
                  left: node.posX,
                  top: node.posY,
                  width: node.width,
                  height: node.height,
                  background: style.bg,
                  color: style.text
                }}
              >
                <div
                  className="flex cursor-grab items-center justify-between border-b border-black/10 px-2 py-1.5 active:cursor-grabbing"
                  onMouseDown={(e) => startDrag(e, node)}
                >
                  <GripVertical size={14} className="opacity-60" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {style.label}
                  </span>
                  <button
                    type="button"
                    aria-label="Karte löschen"
                    className="rounded-md p-1 opacity-60 transition hover:bg-black/10 hover:opacity-100"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => deleteNode(node.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <textarea
                  value={node.content}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) => (n.id === node.id ? { ...n, content: e.target.value } : n))
                    )
                  }
                  onBlur={(e) => updateNodeContent(node.id, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="min-h-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:opacity-50"
                  placeholder="Idee eingeben…"
                  style={{ color: style.text }}
                />
              </div>
            );
          })}
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted">+ Sticky hinzufügen und loslegen</p>
            </div>
          ) : null}
        </div>
      ) : (
        <Panel className="community-panel">
          <EmptyState>Board erstellen oder aus der Liste wählen.</EmptyState>
        </Panel>
      )}
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word + " ";
      yy += 18;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}
