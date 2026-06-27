const COLOR_CLASS: Record<string, string> = {
  red: "chat-md-red",
  green: "chat-md-green",
  yellow: "chat-md-yellow",
  blue: "chat-md-blue",
  orange: "chat-md-orange"
};

/** Converts [[red]]word[[/red]] tags into safe span classes for markdown rendering. */
export function preprocessChatMarkdown(content: string) {
  let text = content;

  for (const [color, className] of Object.entries(COLOR_CLASS)) {
    text = text.replace(
      new RegExp(`\\[\\[${color}\\]\\]([\\s\\S]*?)\\[\\[\\/${color}\\]\\]`, "gi"),
      `<span class="${className}">$1</span>`
    );
  }

  return text;
}

export function buildChatMarkdownInstructions() {
  return (
    "MARKDOWN FORMATTING (ChatGPT-style):\n" +
    "- Use GitHub markdown: bullet lists (- item), numbered lists (1. item), **bold**, and tables (| Header | Header |).\n" +
    "- Use markdown tables for comparisons, plans, specs, or structured data.\n" +
    "- Highlight important words sparingly with color tags: [[red]]warning[[/red]], [[green]]success[[/green]], [[yellow]]note[[/yellow]], [[blue]]info[[/blue]], [[orange]]important[[/orange]] — only a few per reply.\n" +
    "- Do not wrap the whole answer in a single code block.\n" +
    "EMOJI STYLE (ChatGPT-style): Use emojis naturally and in moderation when they fit the tone — e.g. a friendly greeting, celebration 🎉, a tip 💡, or a casual chat. Usually 0-2 per reply. " +
    "Do NOT force emojis into every message or every sentence, and skip them for serious, technical, factual, or formal answers. Never start every reply with the same emoji."
  );
}
