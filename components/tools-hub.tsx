"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  Briefcase,
  Globe,
  Loader2,
  Palette,
  Sparkles,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { readJsonResponse } from "@/lib/fetch-json";
import { downloadImageAsset } from "@/lib/image-download";
import { getToolsByCategory, TOOL_DEFINITIONS } from "@/lib/tools/registry";
import type { ToolCategory, ToolDefinition } from "@/lib/tools/types";
import { ChatImage } from "@/components/chat-image";

type ToolsHubProps = {
  userId: string;
};

type RunResponse = {
  error?: string;
  reply?: string;
  image?: string;
  imageGenPrompt?: string;
  imageError?: string;
  sources?: string[];
};

const CATEGORY_META: Record<
  ToolCategory,
  { label: string; icon: typeof Sparkles; color: string }
> = {
  creative: { label: "Creative Tools", icon: Palette, color: "text-pink-200" },
  business: { label: "Business Tools", icon: Briefcase, color: "text-sky-200" },
  advanced: { label: "Advanced AI", icon: Bot, color: "text-violet-200" }
};

function defaultValues(tool: ToolDefinition) {
  const values: Record<string, string> = {};
  for (const field of tool.fields) {
    if (field.type === "select" && field.options?.[0]) {
      values[field.id] = field.options[0];
    } else {
      values[field.id] = "";
    }
  }
  return values;
}

export function ToolsHub({ userId }: ToolsHubProps) {
  const { language, t } = useLanguage();
  const [category, setCategory] = useState<ToolCategory>("creative");
  const [activeTool, setActiveTool] = useState<ToolDefinition | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultImagePrompt, setResultImagePrompt] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [savingImage, setSavingImage] = useState(false);

  const tools = useMemo(() => getToolsByCategory(category), [category]);

  const openTool = useCallback((tool: ToolDefinition) => {
    setActiveTool(tool);
    setValues(defaultValues(tool));
    setResult(null);
    setResultImage(null);
    setResultImagePrompt(null);
    setImageError(null);
    setError(null);
    setSources([]);
  }, []);

  async function runTool() {
    if (!activeTool) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setResultImage(null);
    setResultImagePrompt(null);
    setImageError(null);
    setSources([]);

    try {
      const res = await fetch("/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          toolId: activeTool.id,
          values,
          language
        })
      });
      const data = await readJsonResponse<RunResponse>(res);
      if (!res.ok) {
        setError(data.error || "Tool failed.");
        return;
      }
      setResult(data.reply ?? "");
      setResultImage(data.image ?? null);
      setResultImagePrompt(data.imageGenPrompt ?? null);
      setImageError(data.imageError ?? null);
      setSources(data.sources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function saveLogoImage() {
    if (!resultImage) return;
    setSavingImage(true);
    try {
      const brand = (values.brand ?? "logo").trim() || "logo";
      await downloadImageAsset(resultImage, `${brand}-logo.png`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSavingImage(false);
    }
  }

  function exportInvoicePdf() {
    if (activeTool?.id !== "invoice-generator") return;
    const lines = (values.items ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const taxRate = Number.parseFloat(values.tax || "19") / 100;
    let subtotal = 0;
    const rows = lines.map((line) => {
      const [name, priceRaw] = line.split(":");
      const price = Number.parseFloat((priceRaw ?? "0").replace(/[^\d.]/g, "")) || 0;
      subtotal += price;
      return { name: name?.trim() || line, price };
    });
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const html = `<!DOCTYPE html><html><head><title>Invoice</title><style>
      body{font-family:Arial,sans-serif;padding:40px;color:#111}
      h1{margin:0 0 8px} table{width:100%;border-collapse:collapse;margin:20px 0}
      td,th{border:1px solid #ccc;padding:8px;text-align:left}
      .right{text-align:right}
    </style></head><body>
      <h1>Invoice</h1>
      <p><strong>From:</strong> ${values.from ?? ""}<br><strong>To:</strong> ${values.to ?? ""}</p>
      <table><tr><th>Item</th><th class="right">Price</th></tr>
      ${rows.map((r) => `<tr><td>${r.name}</td><td class="right">€${r.price.toFixed(2)}</td></tr>`).join("")}
      </table>
      <p class="right">Subtotal: €${subtotal.toFixed(2)}<br>Tax (${values.tax || 19}%): €${tax.toFixed(2)}<br><strong>Total: €${total.toFixed(2)}</strong></p>
      ${values.notes ? `<p><strong>Notes:</strong> ${values.notes}</p>` : ""}
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-primary">
            <Wrench size={16} /> Mekkz AI Tools
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Creative, Business & Advanced AI</h1>
          <p className="mt-1 text-sm text-muted">
            {TOOL_DEFINITIONS.length} tools — logo, stories, marketing, SEO, agents, PDF, YouTube & more.
          </p>
        </div>
        <Link
          href="/chat"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          ← Back to Chat
        </Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_META) as ToolCategory[]).map((key) => {
          const meta = CATEGORY_META[key];
          const Icon = meta.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCategory(key);
                setActiveTool(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
                category === key ? "bg-primary text-white" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <Icon size={16} /> {meta.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <motion.button
            key={tool.id}
            type="button"
            onClick={() => openTool(tool)}
            whileHover={{ scale: 1.02 }}
            className={`glass rounded-2xl border p-4 text-left transition ${
              activeTool?.id === tool.id ? "border-primary bg-primary/10" : "border-white/10"
            }`}
          >
            <h3 className="font-semibold">{tool.name}</h3>
            <p className="mt-2 text-xs leading-5 text-muted">{tool.description}</p>
          </motion.button>
        ))}
      </div>

      {activeTool ? (
        <section className="glass rounded-2xl border border-white/10 p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{activeTool.name}</h2>
              <p className="text-sm text-muted">{activeTool.description}</p>
            </div>
            {activeTool.id === "vision-analyze" ? (
              <Link href="/chat" className="text-sm text-primary hover:underline">
                Upload in Chat →
              </Link>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {activeTool.fields.map((field) => (
              <label key={field.id} className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted">{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    value={values[field.id] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    rows={4}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none focus:border-primary/50"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={values[field.id] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none"
                  >
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt} className="bg-neutral-900">
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={values[field.id] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none focus:border-primary/50"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runTool()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? t("common.loading") : "Generate"}
            </button>
            {activeTool.id === "invoice-generator" ? (
              <button
                type="button"
                onClick={exportInvoicePdf}
                className="rounded-xl bg-white/10 px-5 py-2.5 text-sm transition hover:bg-white/15"
              >
                Export PDF / Print
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
          ) : null}

          {result || resultImage ? (
            <div className="mt-4 space-y-3">
              {imageError && !resultImage ? (
                <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100">
                  Logo-Text ist fertig, aber das Bild konnte nicht erstellt werden: {imageError}
                </p>
              ) : null}
              {resultImage ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Generiertes Logo</p>
                    <button
                      type="button"
                      onClick={() => void saveLogoImage()}
                      disabled={savingImage}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {savingImage ? "Speichern…" : "Bild speichern"}
                    </button>
                  </div>
                  <ChatImage
                    src={resultImage}
                    alt="Generiertes Logo"
                    imageGenPrompt={resultImagePrompt ?? undefined}
                    className="mx-auto max-h-80 w-full max-w-md rounded-xl object-contain"
                  />
                </div>
              ) : null}
              {sources.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Globe size={14} /> Sources:
                  {sources.map((src) => (
                    <a
                      key={src}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {src.slice(0, 48)}…
                    </a>
                  ))}
                </div>
              ) : null}
              {result ? (
                <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm leading-7">
                  {result}
                </pre>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <BookOpen size={16} /> Select a tool above to get started.
        </p>
      )}
    </div>
  );
}
