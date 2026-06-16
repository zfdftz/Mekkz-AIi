import type { ConversationLimitState, UserPlanState } from "@/lib/user-plans";

export type ConversationLimitPayload = ConversationLimitState;

export type ChatStreamMetaEvent = {
  type: "meta";
  conversationId: string;
  userImage?: string;
};

export type ChatStreamDeltaEvent = {
  type: "delta";
  text: string;
};

export type ChatStreamDoneEvent = {
  type: "done";
  reply: string;
  conversationId: string;
  userImage?: string;
  imageCategory?: string;
  plan?: UserPlanState;
  conversationLimit?: ConversationLimitPayload;
  warning?: string;
};

export type ChatStreamErrorEvent = {
  type: "error";
  error: string;
};

export type ChatStreamEvent =
  | ChatStreamMetaEvent
  | ChatStreamDeltaEvent
  | ChatStreamDoneEvent
  | ChatStreamErrorEvent;

export function encodeChatStreamEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export function isChatStreamResponse(contentType: string | null) {
  return (contentType ?? "").includes("ndjson");
}

type ReadChatStreamHandlers = {
  onMeta?: (event: ChatStreamMetaEvent) => void;
  onDelta?: (chunk: string, fullText: string) => void;
  onDone?: (event: ChatStreamDoneEvent) => void;
  onError?: (message: string) => void;
};

export async function readChatStream(
  response: Response,
  handlers: ReadChatStreamHandlers
): Promise<string> {
  if (!response.body) {
    throw new Error("Streaming-Antwort fehlt.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;

      let event: ChatStreamEvent;
      try {
        event = JSON.parse(line) as ChatStreamEvent;
      } catch {
        continue;
      }

      if (event.type === "meta") {
        handlers.onMeta?.(event);
        continue;
      }

      if (event.type === "delta") {
        fullText += event.text;
        handlers.onDelta?.(event.text, fullText);
        continue;
      }

      if (event.type === "done") {
        fullText = event.reply || fullText;
        handlers.onDone?.(event);
        continue;
      }

      if (event.type === "error") {
        handlers.onError?.(event.error);
        throw new Error(event.error);
      }
    }
  }

  return fullText;
}
