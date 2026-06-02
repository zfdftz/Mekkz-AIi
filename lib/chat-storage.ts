import { ChatMessage } from "./types";

type ChatRow = {
  user_message: string;
  assistant_message: string;
  user_image?: string | null;
  image_name?: string | null;
  assistant_image?: string | null;
  user_image_category?: string | null;
  assistant_image_category?: string | null;
  created_at?: string;
};

type InsertPayload = {
  user_id: string;
  conversation_id: string;
  user_message: string;
  assistant_message: string;
  user_image?: string | null;
  image_name?: string | null;
  assistant_image?: string | null;
  user_image_category?: string | null;
  assistant_image_category?: string | null;
};

function isMissingColumnError(message: string) {
  return /column|does not exist|Could not find/i.test(message);
}

export function rowsToMessages(rows: ChatRow[]): ChatMessage[] {
  return rows.flatMap((row) => {
    const userMsg: ChatMessage = {
      role: "user",
      content: row.user_message,
      ...(row.user_image
        ? {
            images: [row.user_image],
            imageName: row.image_name ?? undefined,
            imageCategory: row.user_image_category ?? undefined
          }
        : {})
    };
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: row.assistant_message,
      ...(row.assistant_image
        ? {
            generatedImage: row.assistant_image,
            imageCategory: row.assistant_image_category ?? undefined
          }
        : row.user_image
          ? { imageCategory: row.user_image_category ?? undefined }
          : {})
    };
    return [userMsg, assistantMsg];
  });
}

export async function fetchConversationMessages(
  admin: { from: (table: string) => any },
  userId: string,
  conversationId: string
) {
  const fullSelect =
    "user_message, assistant_message, user_image, image_name, assistant_image, user_image_category, assistant_image_category, created_at";
  const basicSelect = "user_message, assistant_message, created_at";

  let result = await admin
    .from("chat_messages")
    .select(fullSelect)
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (result.error && isMissingColumnError(result.error.message)) {
    result = await admin
      .from("chat_messages")
      .select(basicSelect)
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
  }

  return result;
}

export async function insertConversationMessage(
  admin: { from: (table: string) => any },
  payload: InsertPayload
) {
  const fullPayload = {
    user_id: payload.user_id,
    conversation_id: payload.conversation_id,
    user_message: payload.user_message,
    assistant_message: payload.assistant_message,
    user_image: payload.user_image ?? null,
    image_name: payload.image_name ?? null,
    assistant_image: payload.assistant_image ?? null,
    user_image_category: payload.user_image_category ?? null,
    assistant_image_category: payload.assistant_image_category ?? null
  };

  let result = await admin.from("chat_messages").insert(fullPayload);
  if (result.error && isMissingColumnError(result.error.message)) {
    result = await admin.from("chat_messages").insert({
      user_id: payload.user_id,
      conversation_id: payload.conversation_id,
      user_message: payload.user_message,
      assistant_message: payload.assistant_message
    });
  }

  return result;
}

export async function countConversationMessages(
  admin: { from: (table: string) => any },
  userId: string,
  conversationId: string
) {
  const { count, error } = await admin
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("conversation_id", conversationId);

  if (error) return 0;
  return count ?? 0;
}

export function messagesForRequest(messages: ChatMessage[]) {
  return messages.map((message, index) => {
    const isLast = index === messages.length - 1;
    const payload: ChatMessage = {
      role: message.role,
      content: message.content
    };

    if (isLast && message.role === "user" && message.images?.length) {
      payload.images = message.images;
      payload.imageName = message.imageName;
    }

    return payload;
  });
}

export function messagesForAI(messages: ChatMessage[]) {
  return messages.map((message, index) => {
    const isLast = index === messages.length - 1;
    if (message.role === "user" && message.images?.length && !isLast) {
      return {
        ...message,
        images: undefined,
        content:
          message.content.trim() ||
          `[Bild: ${message.imageName || "hochgeladen"}]`
      };
    }
    if (message.role === "assistant" && message.generatedImage) {
      return {
        ...message,
        generatedImage: undefined,
        content:
          message.content.trim() ||
          "[Die KI hat hier ein generiertes Bild gesendet.]"
      };
    }
    return message;
  });
}
