"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  Briefcase,
  Globe,
  GraduationCap,
  Loader2,
  Palette,
  Sparkles,
  Wrench,
  X
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { useLanguage } from "@/components/language-provider";
import { useAiPreferences } from "@/hooks/use-ai-preferences";
import { readJsonResponse } from "@/lib/fetch-json";
import { downloadImageAsset } from "@/lib/image-download";
import { getToolsByCategory, TOOL_DEFINITIONS } from "@/lib/tools/registry";
import type { ToolCategory, ToolDefinition } from "@/lib/tools/types";
import { TUTOR_LEVELS } from "@/lib/tutor";
import { ChatImage } from "@/components/chat-image";
import type { TranslationKey } from "@/lib/i18n/types";

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

const CATEGORY_KEYS: Record<
  ToolCategory,
  { labelKey: TranslationKey; icon: typeof Sparkles; color: string; ring: string }
> = {
  creative: {
    labelKey: "tools.categoryCreative",
    icon: Palette,
    color: "text-pink-200",
    ring: "ring-pink-400/30"
  },
  business: {
    labelKey: "tools.categoryBusiness",
    icon: Briefcase,
    color: "text-sky-200",
    ring: "ring-sky-400/30"
  },
  advanced: {
    labelKey: "tools.categoryAdvanced",
    icon: Bot,
    color: "text-violet-200",
    ring: "ring-violet-400/30"
  }
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
  const { preferences: aiPreferences, loading: prefsLoading, updatePreferences } =
    useAiPreferences(userId);
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

  const closeTool = useCallback(() => {
    setActiveTool(null);
    setError(null);
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
        setError(data.error || t("tools.toolFailed"));
        return;
      }
      setResult(data.reply ?? "");
      setResultImage(data.image ?? null);
      setResultImagePrompt(data.imageGenPrompt ?? null);
      setImageError(data.imageError ?? null);
      setSources(data.sources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tools.networkError"));
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
      setError(err instanceof Error ? err.message : t("tools.saveFailed"));
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

  const activeCategoryMeta = CATEGORY_KEYS[category];

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-7xl flex-col gap-3 overflow-hidden px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 lg:px-8">
      <header className="glass shrink-0 rounded-2xl border border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-primary">
              <Wrench size={16} /> {t("tools.badge")}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t("tools.title")}</h1>
            <p className="mt-1 text-sm text-muted">
              {t("tools.subtitle", { count: TOOL_DEFINITIONS.length })}
            </p>
          </div>
          <Link
            href="/chat"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t("tools.backToChat")}
          </Link>
        </div>

        <section className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <GraduationCap size={20} className="mt-0.5 shrink-0 text-emerald-200" />
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">{t("tools.tutor")}</h2>
                <p className="text-xs text-muted sm:text-sm">{t("tools.tutorHint")}</p>
              </div>
            </div>
            <span
              className={`shrink-0 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                aiPreferences.tutorModeEnabled
                  ? "bg-emerald-500/20 text-emerald-100"
                  : "bg-white/10 text-muted"
              }`}
            >
              {aiPreferences.tutorModeEnabled
                ? t("tools.tutorEnabled")
                : t("tools.tutorDisabled")}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-xs">
            <button
              type="button"
              disabled={prefsLoading}
              onClick={() => void updatePreferences({ tutorModeEnabled: true })}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                aiPreferences.tutorModeEnabled
                  ? "bg-primary text-white shadow-glow"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              {t("tools.tutorEnabled")}
            </button>
            <button
              type="button"
              disabled={prefsLoading}
              onClick={() => void updatePreferences({ tutorModeEnabled: false })}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                !aiPreferences.tutorModeEnabled
                  ? "bg-primary text-white shadow-glow"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              {t("tools.tutorDisabled")}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("tools.tutorLevel")}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:max-w-md">
              {TUTOR_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={prefsLoading}
                  onClick={() => void updatePreferences({ tutorLevel: level })}
                  className={`rounded-xl px-2 py-2 text-xs font-medium transition disabled:opacity-50 sm:text-sm ${
                    aiPreferences.tutorLevel === level
                      ? "bg-primary text-white"
                      : "bg-white/10 hover:bg-white/15"
                  }`}
                >
                  {t(`tutor.${level}` as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
        </section>
      </header>

      <div className="-mx-1 flex shrink-0 gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {(Object.keys(CATEGORY_KEYS) as ToolCategory[]).map((key) => {
          const meta = CATEGORY_KEYS[key];
          const Icon = meta.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCategory(key);
                setActiveTool(null);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
                category === key
                  ? "bg-primary text-white shadow-glow"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <Icon size={16} /> {t(meta.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-4">
        <aside className="glass flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10">
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <p className={`flex items-center gap-2 text-sm font-medium ${activeCategoryMeta.color}`}>
              <activeCategoryMeta.icon size={16} />
              {t(activeCategoryMeta.labelKey)} {t("tools.categoryToolsSuffix")}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {t("tools.availableCount", { count: tools.length })}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth p-2 sm:p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {tools.map((tool) => (
                <motion.button
                  key={tool.id}
                  type="button"
                  onClick={() => openTool(tool)}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-xl border p-3 text-left transition ${
                    activeTool?.id === tool.id
                      ? `border-primary/50 bg-primary/10 ring-1 ${activeCategoryMeta.ring}`
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <h3 className="text-sm font-semibold leading-snug">{tool.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{tool.description}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </aside>

        <section className="glass flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10">
          {!activeTool ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
              <BookOpen size={28} className="text-muted" />
              <p className="max-w-sm text-sm text-muted">{t("tools.pickTool")}</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-white/10 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold sm:text-2xl">{activeTool.name}</h2>
                    <p className="mt-1 text-sm text-muted">{activeTool.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {activeTool.id === "vision-analyze" ? (
                      <Link href="/chat" className="hidden text-sm text-primary hover:underline sm:inline">
                        {t("tools.uploadInChat")}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={closeTool}
                      className="rounded-lg bg-white/10 p-2 transition hover:bg-white/15 lg:hidden"
                      aria-label={t("tools.closeTool")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeTool.fields.map((field) => (
                    <label
                      key={field.id}
                      className={`flex flex-col gap-1.5 text-sm ${
                        field.type === "textarea" ? "sm:col-span-2" : ""
                      }`}
                    >
                      <span className="font-medium text-muted">{field.label}</span>
                      {field.type === "textarea" ? (
                        <textarea
                          value={values[field.id] ?? ""}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          rows={4}
                          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none transition focus:border-primary/50"
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={values[field.id] ?? ""}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none"
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
                          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 outline-none transition focus:border-primary/50"
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
                    {loading ? t("common.loading") : t("tools.generate")}
                  </button>
                  {activeTool.id === "invoice-generator" ? (
                    <button
                      type="button"
                      onClick={exportInvoicePdf}
                      className="rounded-xl bg-white/10 px-5 py-2.5 text-sm transition hover:bg-white/15"
                    >
                      {t("tools.exportPdf")}
                    </button>
                  ) : null}
                </div>

                {error ? (
                  <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
                ) : null}

                {result || resultImage ? (
                  <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                    {imageError && !resultImage ? (
                      <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100">
                        {t("tools.logoImageFailed", { error: imageError })}
                      </p>
                    ) : null}
                    {resultImage ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{t("tools.generatedLogo")}</p>
                          <button
                            type="button"
                            onClick={() => void saveLogoImage()}
                            disabled={savingImage}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            {savingImage ? t("tools.saving") : t("tools.saveImage")}
                          </button>
                        </div>
                        <ChatImage
                          src={resultImage}
                          alt={t("tools.generatedLogoAlt")}
                          imageGenPrompt={resultImagePrompt ?? undefined}
                          className="mx-auto max-h-80 w-full max-w-md rounded-xl object-contain"
                        />
                      </div>
                    ) : null}
                    {sources.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Globe size={14} /> {t("tools.sources")}
                        {sources.map((src) => (
                          <a
                            key={src}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-full truncate text-primary hover:underline"
                          >
                            {src}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {result ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                          {t("tools.result")}
                        </p>
                        <div className="overflow-x-auto">
                          <ChatMarkdown content={result} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
