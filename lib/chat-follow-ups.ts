const STARTERS = [
  "What matters most to you",
  "Out of curiosity",
  "Quick question",
  "Just wondering",
  "To tailor this better",
  "So I can help more precisely",
  "One thing I'd like to know",
  "Before we go on",
  "To narrow this down",
  "If you don't mind me asking",
  "Help me understand",
  "What's your take on",
  "How do you feel about",
  "Where are you with",
  "What's the priority for you regarding",
  "Which angle interests you more",
  "What would success look like for",
  "Is there a deadline for",
  "Have you already decided on",
  "Are you leaning toward",
  "What made you think about",
  "What triggered this question about",
  "Do you prefer",
  "Would you rather focus on",
  "Should we optimize for",
  "Is your main concern",
  "Are you mainly worried about",
  "What would make this easier for you with",
  "Which part feels unclear about",
  "What have you tried so far with",
  "What's blocking you on",
  "How urgent is",
  "Who else is involved in",
  "What's the context behind",
  "Is this for work or personal",
  "How experienced are you with",
  "What level of detail do you want on",
  "Should I keep it short or go deep on",
  "Want a quick fix or a full plan for",
  "What outcome would make you happy with"
];

const TOPICS = [
  "your end goal",
  "the timeline",
  "your budget",
  "the format you need",
  "how you'll use this",
  "what you've already tried",
  "your biggest constraint",
  "the part that's confusing",
  "the next step you want",
  "whether speed or quality matters more",
  "who the audience is",
  "how technical you want it",
  "your preferred style",
  "the scope of the project",
  "what 'done' looks like",
  "your current setup",
  "the tools you already use",
  "how much time you have",
  "whether this is urgent",
  "the risk you're most afraid of",
  "what you'd regret not doing",
  "your must-haves vs nice-to-haves",
  "how hands-on you want to be",
  "whether you want examples",
  "if you prefer steps or a big picture",
  "your experience level here",
  "the main trade-off you're facing",
  "what you've ruled out already",
  "what surprised you so far",
  "the hardest part for you",
  "what would simplify this",
  "your ideal outcome in one sentence",
  "whether you want alternatives",
  "how picky you are about details",
  "if there's a hard deadline",
  "who needs to approve this",
  "what language or tone you want",
  "whether you want pros and cons",
  "how much background context to include",
  "if you want me to challenge your idea",
  "what you'd do if you had more time",
  "what you'd do if you had less time",
  "the one thing you can't compromise on",
  "whether you've seen a similar solution",
  "what felt wrong about other attempts",
  "how you measure success here",
  "what resources you already have",
  "what's still missing",
  "whether you want a template",
  "if a checklist would help"
];

const ENDINGS = [
  "right now?",
  "for you?",
  "in your case?",
  "here?",
  "at the moment?",
  "for this task?",
  "for your project?",
  "today?",
  "going forward?",
  "before we continue?",
  "— or something else?",
  "— roughly?",
  "— yes or no?",
  "— short answer is fine.",
  "— just so I know.",
  "— that changes my advice.",
  "— pick one if you can.",
  "— or should I assume a default?",
  "— honest answer helps.",
  "— no wrong answer."
];

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function composeFollowUpQuestion(seed: number) {
  const starter = STARTERS[seed % STARTERS.length];
  const topic = TOPICS[Math.floor(seed / STARTERS.length) % TOPICS.length];
  const ending = ENDINGS[Math.floor(seed / (STARTERS.length * TOPICS.length)) % ENDINGS.length];
  return `${starter} ${topic} ${ending}`;
}

/** ~32% of turns get a follow-up instruction; combinatorial pool > 50k unique shapes. */
export function buildFollowUpQuestionPrompt(
  userId: string,
  userTurnCount: number,
  userMessage: string
) {
  const seed = hashSeed(`${userId}:${userTurnCount}:${userMessage.trim().slice(0, 64)}`);
  const askThisTurn = seed % 100 < 32;

  if (!askThisTurn) {
    return (
      "FOLLOW-UP QUESTIONS: Do NOT force a question every time. " +
      "Most replies need no follow-up — only ask when it genuinely helps.\n"
    );
  }

  const example = composeFollowUpQuestion(seed);

  return (
    "FOLLOW-UP QUESTIONS: End this reply with ONE short, natural follow-up question when it fits.\n" +
    `- Invent fresh wording — example shape only (do NOT copy verbatim): "${example}"\n` +
    "- Vary questions every turn; never repeat the same phrasing twice in a row.\n" +
    "- Skip the question for goodbyes, thanks-only messages, or trivial yes/no tasks.\n" +
    "- The question should match the user's language.\n"
  );
}

export function followUpQuestionPoolSize() {
  return STARTERS.length * TOPICS.length * ENDINGS.length;
}
