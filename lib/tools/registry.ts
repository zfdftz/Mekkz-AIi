import type { ToolCategory, ToolDefinition } from "./types";

function v(values: Record<string, string>, key: string, fallback = "") {
  return values[key]?.trim() || fallback;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: "logo-generator",
    category: "creative",
    name: "Logo Generator",
    description: "Logo image + brand concepts, palettes, slogans, and identity guide.",
    fields: [
      { id: "brand", label: "Brand / Company name", type: "text", required: true },
      {
        id: "style",
        label: "Style",
        type: "select",
        options: ["modern", "gaming", "luxury", "minimal", "futuristic"]
      },
      { id: "industry", label: "Industry", type: "text", placeholder: "e.g. gaming, fashion" }
    ],
    systemPrompt:
      "You are a senior brand designer. Output structured sections: Logo Concepts (3), Color Palette (hex codes), Typography suggestions, Slogan options (5), Brand Voice, Usage notes.",
    buildUserPrompt: (values) =>
      `Create a complete brand identity for "${v(values, "brand")}" in ${v(values, "style", "modern")} style. Industry: ${v(values, "industry", "general")}.`
  },
  {
    id: "story-generator",
    category: "creative",
    name: "Story Generator",
    description: "Stories, RPG adventures, fantasy, sci-fi, horror, and interactive narratives.",
    fields: [
      {
        id: "genre",
        label: "Genre",
        type: "select",
        options: ["fantasy", "sci-fi", "horror", "rpg", "adventure", "custom"]
      },
      { id: "length", label: "Length", type: "select", options: ["short", "medium", "long"] },
      { id: "characters", label: "Characters", type: "text" },
      { id: "setting", label: "Setting", type: "text" },
      { id: "prompt", label: "Story idea / direction", type: "textarea", required: true }
    ],
    systemPrompt:
      "You are a master storyteller. Support interactive storytelling — end with 2-3 choices when appropriate. Use vivid scenes and strong pacing.",
    buildUserPrompt: (values) =>
      `Genre: ${v(values, "genre", "fantasy")}. Length: ${v(values, "length", "medium")}. Characters: ${v(values, "characters", "auto")}. Setting: ${v(values, "setting", "auto")}. Direction: ${v(values, "prompt")}`
  },
  {
    id: "discord-builder",
    category: "creative",
    name: "Discord Server Builder",
    description: "Categories, channels, roles, permissions, rules, and welcome messages.",
    fields: [
      { id: "name", label: "Server name", type: "text", required: true },
      {
        id: "template",
        label: "Template",
        type: "select",
        options: ["gaming", "community", "business", "creator"]
      },
      { id: "topic", label: "Topic / niche", type: "textarea" }
    ],
    systemPrompt:
      "You are a Discord community architect. Output: Server Overview, Categories & Channels (with descriptions), Roles & Permissions matrix, Rules (10), Welcome message, Boost perks suggestions.",
    buildUserPrompt: (values) =>
      `Build a Discord server "${v(values, "name")}" using ${v(values, "template", "community")} template. Topic: ${v(values, "topic")}`
  },
  {
    id: "youtube-script",
    category: "creative",
    name: "YouTube Script Generator",
    description: "Scripts for Shorts, TikTok, tutorials, gaming, and long-form videos.",
    fields: [
      { id: "topic", label: "Video topic", type: "text", required: true },
      {
        id: "format",
        label: "Format",
        type: "select",
        options: ["shorts", "tiktok", "long-form", "tutorial", "gaming"]
      },
      { id: "audience", label: "Target audience", type: "text" }
    ],
    systemPrompt:
      "You are a YouTube growth expert. Output: Hook, Title options (5), Full script with timestamps, Description, Tags, CTA. Optimize for engagement and retention.",
    buildUserPrompt: (values) =>
      `Create a ${v(values, "format", "long-form")} video script about "${v(values, "topic")}" for audience: ${v(values, "audience", "general")}.`
  },
  {
    id: "meme-generator",
    category: "creative",
    name: "Meme Generator",
    description: "Meme ideas, captions, and formats for trends and custom themes.",
    fields: [
      { id: "topic", label: "Topic / trend", type: "text", required: true },
      {
        id: "theme",
        label: "Theme",
        type: "select",
        options: ["gaming", "social media", "custom", "viral"]
      }
    ],
    systemPrompt:
      "You are a meme strategist. Output 8 meme concepts with: Format name, Top text, Bottom text, Why it works, Platform suggestion.",
    buildUserPrompt: (values) =>
      `Generate meme ideas for topic "${v(values, "topic")}" with ${v(values, "theme", "custom")} theme.`
  },
  {
    id: "startup-generator",
    category: "business",
    name: "Startup Generator",
    description: "Startup ideas, business models, audience analysis, and monetization.",
    fields: [
      { id: "niche", label: "Niche / interest", type: "text", required: true },
      { id: "budget", label: "Budget level", type: "select", options: ["low", "medium", "high"] }
    ],
    systemPrompt:
      "You are a startup advisor. Output: 3 Startup Ideas, Business Model Canvas summary, Target Audience, Monetization strategies, MVP roadmap, Risks.",
    buildUserPrompt: (values) =>
      `Generate startup ideas in niche "${v(values, "niche")}" with ${v(values, "budget", "low")} budget assumption.`
  },
  {
    id: "marketing-assistant",
    category: "business",
    name: "Marketing Assistant",
    description: "Campaigns, ad copy for all platforms, product descriptions, promotions.",
    fields: [
      { id: "product", label: "Product / service", type: "text", required: true },
      { id: "goal", label: "Campaign goal", type: "text" },
      {
        id: "platforms",
        label: "Platforms",
        type: "text",
        placeholder: "Instagram, TikTok, Google Ads..."
      }
    ],
    systemPrompt:
      "You are a performance marketer. Output platform-specific ad copy, campaign structure, headlines, primary text, and promotional calendar.",
    buildUserPrompt: (values) =>
      `Marketing campaign for "${v(values, "product")}". Goal: ${v(values, "goal", "sales")}. Platforms: ${v(values, "platforms", "all major")}.`
  },
  {
    id: "seo-optimizer",
    category: "business",
    name: "SEO Optimizer",
    description: "Improve SEO, suggest keywords, optimize blog content for ranking.",
    fields: [
      { id: "content", label: "Text / article", type: "textarea", required: true },
      { id: "keyword", label: "Target keyword", type: "text" }
    ],
    systemPrompt:
      "You are an SEO specialist. Output: SEO Score (1-10), Keyword suggestions (primary + 10 secondary), Improved title/meta, Optimized content rewrite, Internal linking ideas.",
    buildUserPrompt: (values) =>
      `Optimize this content for SEO. Target keyword: ${v(values, "keyword", "auto-detect")}.\n\nContent:\n${v(values, "content")}`
  },
  {
    id: "email-writer",
    category: "business",
    name: "Email Writer",
    description: "Professional emails for business, support, sales, and networking.",
    fields: [
      { id: "purpose", label: "Purpose", type: "text", required: true },
      {
        id: "tone",
        label: "Tone",
        type: "select",
        options: ["professional", "friendly", "sales", "support", "networking"]
      },
      { id: "details", label: "Details / context", type: "textarea", required: true }
    ],
    systemPrompt:
      "You are an expert email writer. Output: Subject lines (3), Email body, Optional follow-up. Match the requested tone precisely.",
    buildUserPrompt: (values) =>
      `Write a ${v(values, "tone", "professional")} email. Purpose: ${v(values, "purpose")}. Context: ${v(values, "details")}`
  },
  {
    id: "invoice-generator",
    category: "business",
    name: "Invoice Generator",
    description: "Create professional invoices (use form below, then export PDF).",
    fields: [
      { id: "from", label: "Your business name", type: "text", required: true },
      { id: "to", label: "Client name", type: "text", required: true },
      { id: "items", label: "Items (name:price per line)", type: "textarea", required: true },
      { id: "tax", label: "Tax rate %", type: "number" },
      { id: "notes", label: "Notes", type: "textarea" }
    ],
    systemPrompt:
      "You format invoice data clearly. Output a structured invoice preview with line items, subtotal, tax, total, payment terms. Use markdown tables.",
    buildUserPrompt: (values) =>
      `Format invoice from ${v(values, "from")} to ${v(values, "to")}. Items:\n${v(values, "items")}\nTax: ${v(values, "tax", "19")}%. Notes: ${v(values, "notes", "none")}`
  },
  {
    id: "ai-agents",
    category: "advanced",
    name: "AI Agents",
    description: "Multiple specialized agents collaborate on your task.",
    fields: [
      {
        id: "agents",
        label: "Agents (comma-separated)",
        type: "text",
        placeholder: "programmer, designer, marketing",
        required: true
      },
      { id: "task", label: "Task", type: "textarea", required: true }
    ],
    systemPrompt:
      "You simulate a team of AI agents. Each agent section is labeled with their role. Agents discuss, then deliver a unified final recommendation.",
    buildUserPrompt: (values) =>
      `Agents: ${v(values, "agents")}. Task: ${v(values, "task")}. Each agent contributes, then synthesize a final plan.`
  },
  {
    id: "internet-mode",
    category: "advanced",
    name: "Internet Mode",
    description: "Search the web for current information with sources.",
    fields: [
      { id: "query", label: "Search query", type: "text", required: true }
    ],
    systemPrompt:
      "You answer using provided web research. Cite sources. Summarize clearly. Note if information may be outdated.",
    buildUserPrompt: (values) => v(values, "query")
  },
  {
    id: "vision-analyze",
    category: "advanced",
    name: "Vision System",
    description: "Upload an image in chat for analysis — or describe analysis needs here.",
    fields: [
      { id: "question", label: "What to analyze", type: "textarea", required: true }
    ],
    systemPrompt:
      "You are a vision analysis expert. If no image is attached, explain what analysis you would perform and ask user to upload in chat.",
    buildUserPrompt: (values) => v(values, "question")
  },
  {
    id: "pdf-chat",
    category: "advanced",
    name: "PDF Chat",
    description: "Paste PDF text or upload below to ask questions.",
    fields: [
      { id: "pdfText", label: "PDF text content", type: "textarea", required: true },
      { id: "question", label: "Your question", type: "text", required: true }
    ],
    systemPrompt:
      "Answer questions strictly based on the provided PDF text. If answer not in document, say so. Offer summary on request.",
    buildUserPrompt: (values) =>
      `PDF CONTENT:\n${v(values, "pdfText").slice(0, 12000)}\n\nQUESTION: ${v(values, "question")}`
  },
  {
    id: "youtube-chat",
    category: "advanced",
    name: "YouTube Chat",
    description: "YouTube URL — summary, comments, who said what, and Q&A.",
    fields: [
      { id: "url", label: "YouTube URL", type: "text", required: true },
      { id: "question", label: "Question (optional)", type: "text" }
    ],
    systemPrompt:
      "Analyze the YouTube video using provided metadata, description, and scraped comments. " +
      "Output: Summary, Key points, Comments overview (who said what — quote usernames + comment text), " +
      "Notable reactions/themes, Answer to the user's question. " +
      "If comments are missing, say so honestly and use title/description only.",
    buildUserPrompt: (values) =>
      `YouTube URL: ${v(values, "url")}. Question: ${v(values, "question", "Summarize the video and analyze the comments — who said what?")}`
  },
  {
    id: "tiktok-chat",
    category: "advanced",
    name: "TikTok Chat",
    description: "TikTok video or profile URL — creator info, comments, and insights.",
    fields: [
      { id: "url", label: "TikTok URL", type: "text", required: true, placeholder: "https://www.tiktok.com/@user/video/..." },
      { id: "question", label: "Question (optional)", type: "text" }
    ],
    systemPrompt:
      "Analyze TikTok content from provided profile/video metadata and scraped comments. " +
      "Output: Profile/creator overview (bio, stats if available), Video summary, " +
      "Comments breakdown (who said what), Trends or themes in comments, Answer to user question. " +
      "If data is limited, say what you could and could not load.",
    buildUserPrompt: (values) =>
      `TikTok URL: ${v(values, "url")}. Question: ${v(values, "question", "What can you tell me about this profile/video and the comments?")}`
  },
  {
    id: "ai-browser",
    category: "advanced",
    name: "AI Browser",
    description: "Read and summarize any webpage.",
    fields: [
      { id: "url", label: "Website URL", type: "text", required: true },
      { id: "question", label: "What to extract", type: "text" }
    ],
    systemPrompt:
      "Answer based on webpage content provided. Summarize key information and answer the user's question with references to page sections.",
    buildUserPrompt: (values) =>
      `Analyze URL: ${v(values, "url")}. Focus: ${v(values, "question", "full summary")}`
  },
  {
    id: "custom-characters",
    category: "advanced",
    name: "Custom Characters",
    description: "Create a custom AI personality and chat with it.",
    fields: [
      { id: "name", label: "Character name", type: "text", required: true },
      { id: "personality", label: "Personality & behavior", type: "textarea", required: true },
      { id: "message", label: "Message to character", type: "textarea", required: true }
    ],
    systemPrompt: "Stay fully in character. Never break the defined personality.",
    buildUserPrompt: (values) =>
      `CHARACTER: ${v(values, "name")}\nPERSONALITY: ${v(values, "personality")}\n\nUSER MESSAGE: ${v(values, "message")}`
  },
  {
    id: "ai-games",
    category: "advanced",
    name: "AI Games",
    description: "Text-based RPG, adventure, survival, and choice stories.",
    fields: [
      {
        id: "mode",
        label: "Game mode",
        type: "select",
        options: ["rpg", "adventure", "survival", "choice-story"]
      },
      { id: "action", label: "Your action / choice", type: "textarea", required: true }
    ],
    systemPrompt:
      "You are a game master. Track health, inventory, location implicitly. Present scenes vividly. Offer 3 choices. Show stats when relevant. Save-friendly format.",
    buildUserPrompt: (values) =>
      `Mode: ${v(values, "mode", "rpg")}. Player action: ${v(values, "action")}. Continue the game.`
  }
];

export function getToolById(id: string) {
  return TOOL_DEFINITIONS.find((tool) => tool.id === id) ?? null;
}

export function getToolsByCategory(category: ToolCategory) {
  return TOOL_DEFINITIONS.filter((tool) => tool.category === category);
}
