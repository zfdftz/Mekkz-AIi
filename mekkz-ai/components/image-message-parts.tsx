import { getCategoryMeta, parseAnalysisSections } from "@/lib/image-categories";

export function ImageCategoryBadge({ category }: { category?: string | null }) {
  const meta = getCategoryMeta(category);
  return (
    <span className={`mb-2 inline-block rounded-full px-2.5 py-1 text-xs ${meta.badgeClass}`}>
      {meta.label}
    </span>
  );
}

export function StructuredAnalysis({ content }: { content: string }) {
  const sections = parseAnalysisSections(content);
  if (!sections) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div key={section.title} className="rounded-xl bg-black/10 p-2.5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {section.title}
          </p>
          <p className="whitespace-pre-wrap text-sm">{section.body}</p>
        </div>
      ))}
    </div>
  );
}
