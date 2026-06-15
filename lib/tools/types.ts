export type ToolCategory = "creative" | "business" | "advanced";

export type ToolFieldType = "text" | "textarea" | "select" | "number";

export type ToolField = {
  id: string;
  label: string;
  type: ToolFieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export type ToolDefinition = {
  id: string;
  category: ToolCategory;
  name: string;
  description: string;
  fields: ToolField[];
  systemPrompt: string;
  buildUserPrompt: (values: Record<string, string>) => string;
};

export type AgentId =
  | "programmer"
  | "designer"
  | "business"
  | "research"
  | "marketing";

export const AGENT_PROMPTS: Record<AgentId, string> = {
  programmer:
    "Programmer Agent: write clean code, explain architecture, debug issues, suggest best practices.",
  designer:
    "Designer Agent: focus on UX/UI, visual hierarchy, branding, color, and layout.",
  business:
    "Business Agent: strategy, revenue, operations, pricing, and market positioning.",
  research:
    "Research Agent: gather facts, compare options, cite sources, summarize findings.",
  marketing:
    "Marketing Agent: campaigns, hooks, ad copy, audience targeting, and conversion."
};
