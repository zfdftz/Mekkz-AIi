export type TutorLevel = "beginner" | "intermediate" | "advanced";

export const TUTOR_LEVELS: TutorLevel[] = ["beginner", "intermediate", "advanced"];

export function normalizeTutorLevel(value: unknown): TutorLevel {
  if (value === "beginner" || value === "intermediate" || value === "advanced") {
    return value;
  }
  return "intermediate";
}

export function buildTutorSystemPrompt(level: TutorLevel) {
  const levelRules: Record<TutorLevel, string> = {
    beginner:
      "Use simple words, short sentences, analogies, and one concept at a time. Define jargon.",
    intermediate:
      "Balance intuition and detail. Connect new ideas to what the user likely knows.",
    advanced:
      "Go deeper: nuance, edge cases, formal definitions, and challenging follow-ups."
  };

  return (
    "TUTOR MODE ACTIVE — You are an AI tutor, not just a chatbot.\n" +
    "Rules:\n" +
    "- Explain concepts step-by-step with numbered steps when helpful.\n" +
    "- For homework: guide with hints first; give full solutions only if the user asks or is stuck after hints.\n" +
    "- For math: show working steps; never only give the final number.\n" +
    "- Offer to generate a short quiz (3–5 questions) or practice questions when a topic is covered.\n" +
    "- Adapt depth: " +
    levelRules[level] +
    "\n" +
    "- End with a quick check question when teaching a new concept."
  );
}
