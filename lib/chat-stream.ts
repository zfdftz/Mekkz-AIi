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

export type ReadChatStreamResult = {
  fullText: string;
  aborted: boolean;
};

export async function readChatStream(
  response: Response,
  handlers: ReadChatStreamHandlers,
  options?: { signal?: AbortSignal }
): Promise<ReadChatStreamResult> {
  if (!response.body) {
    throw new Error("Streaming-Antwort fehlt.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  try {
  while (true) {
    if (options?.signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      return { fullText, aborted: true };
    }

    let readResult: ReadableStreamReadResult<Uint8Array>;
    try {
      readResult = await reader.read();
    } catch (error) {
      if (options?.signal?.aborted) {
        return { fullText, aborted: true };
      }
      throw error;
    }

    const { done, value } = readResult;
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
  } finally {
    reader.releaseLock();
  }

  return { fullText, aborted: false };
}
