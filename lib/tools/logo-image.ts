function v(values: Record<string, string>, key: string, fallback = "") {
  return values[key]?.trim() || fallback;
}

export function buildLogoImagePrompt(values: Record<string, string>) {
  const brand = v(values, "brand", "Brand");
  const style = v(values, "style", "modern");
  const industry = v(values, "industry", "business");

  return [
    `Professional ${style} logo for "${brand}"`,
    `${industry} industry`,
    "vector logo mark",
    "clean flat design",
    "centered on plain white background",
    "minimalist iconic symbol",
    "high quality brand identity",
    "no mockup",
    "no watermark"
  ].join(", ");
}
