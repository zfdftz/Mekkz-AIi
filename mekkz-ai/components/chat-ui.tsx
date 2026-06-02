"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus, Mic, Paperclip, Send, Settings, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsPanel } from "./settings-panel";
import { ChatMessage, Conversation } from "@/lib/types";
import { messagesForRequest } from "@/lib/chat-storage";
import { categorizeUploadedImage, getCategoryMeta } from "@/lib/image-categories";
import { wantsImageGeneration } from "@/lib/image-gen";
import { resolveChatImageSrc } from "@/lib/image-display";
import { ImageCategoryBadge, StructuredAnalysis } from "./image-message-parts";
import { compressImageToBase64, isImageFile } from "@/lib/image-utils";
import { createClient } from "@/lib/supabase/client";
import { WavyBackground } from "./wavy-background";
import { PlanUpgrade } from "./plan-upgrade";

type ConversationLimit = {
  used: number;
  limit: number | null;
  remaining: number | null;
};

function hasFiniteChatLimit(
  limit: ConversationLimit | null
): limit is ConversationLimit & { limit: number; remaining: number } {
  return limit != null && limit.limit != null && limit.remaining != null;
}

export function ChatUI({ userId, userEmail = "" }: { userId: string; userEmail?: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    name: string;
    preview: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loadingHint, setLoadingHint] = useState("KI schreibt...");
  const [chatLimit, setChatLimit] = useState<ConversationLimit | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(
    null
  );

  const chatFull = hasFiniteChatLimit(chatLimit) && chatLimit.remaining <= 0;

  const canSend = useMemo(
    () => (input.trim().length > 0 || pendingImage) && !isLoading && !chatFull,
    [input, pendingImage, isLoading, chatFull]
  );

  const loadConversations = useCallback(async () => {
    const res = await fetch(`/api/conversations?userId=${userId}`);
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error || "Chats konnten nicht geladen werden.");
      return [] as Conversation[];
    }
    setLoadError(null);
    setConversations(data.conversations ?? []);
    return (data.conversations ?? []) as Conversation[];
  }, [userId]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const res = await fetch(
        `/api/history?userId=${userId}&conversationId=${conversationId}`
      );
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Chat-Verlauf konnte nicht geladen werden.");
        setMessages([]);
        return;
      }
      setLoadError(null);
      setMessages(data.messages ?? []);
      setChatLimit(data.conversationLimit ?? null);
      setShowWelcome((data.messages ?? []).length === 0);
    },
    [userId]
  );

  const startNewChat = useCallback(async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (!res.ok || !data.conversation) {
      setLoadError(data.error || "Neuer Chat konnte nicht erstellt werden.");
      return;
    }

    const created = data.conversation as Conversation;
    setActiveConversationId(created.id);
    setMessages([]);
    setInput("");
    setShowWelcome(true);
    setChatLimit({ used: 0, limit: null, remaining: null });
    await loadConversations();

    const limitRes = await fetch(
      `/api/history?userId=${userId}&conversationId=${created.id}`
    );
    const limitData = await limitRes.json();
    if (limitRes.ok) {
      setChatLimit(limitData.conversationLimit ?? null);
    }
  }, [userId, loadConversations]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const list = await loadConversations();
      if (cancelled) return;
      if (list.length > 0) {
        setActiveConversationId(list[0].id);
        await loadMessages(list[0].id);
      } else {
        await startNewChat();
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [userId, loadConversations, loadMessages, startNewChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function selectConversation(conversationId: string) {
    if (conversationId === activeConversationId) return;
    setActiveConversationId(conversationId);
    setInput("");
    setShowWelcome(false);
    await loadMessages(conversationId);
  }

  async function deleteConversation(conversationId: string) {
    const chat = conversations.find((item) => item.id === conversationId);
    const label = chat?.title || "diesen Chat";
    const confirmed = window.confirm(`„${label}“ wirklich löschen?`);
    if (!confirmed) return;

    setDeletingConversationId(conversationId);
    setLoadError(null);

    try {
      const res = await fetch(
        `/api/conversations?userId=${userId}&conversationId=${conversationId}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (!res.ok) {
        setLoadError(data.error || "Chat konnte nicht gelöscht werden.");
        return;
      }

      const remaining = conversations.filter((item) => item.id !== conversationId);
      setConversations(remaining);

      if (activeConversationId !== conversationId) {
        return;
      }

      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
        await loadMessages(remaining[0].id);
        return;
      }

      await startNewChat();
    } finally {
      setDeletingConversationId(null);
    }
  }

  async function streamAssistantMessage(
    fullText: string,
    generatedImage?: string,
    imageCategory?: string
  ) {
    if (!fullText && !generatedImage) return;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: fullText ? "" : fullText,
        ...(generatedImage ? { generatedImage } : {}),
        ...(imageCategory ? { imageCategory } : {})
      }
    ]);

    if (!fullText) return;

    let cursor = 0;
    const chunkSize = Math.max(1, Math.floor(fullText.length / 90));

    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        cursor = Math.min(fullText.length, cursor + chunkSize);
        const partial = fullText.slice(0, cursor);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: partial };
          }
          return copy;
        });

        if (cursor >= fullText.length) {
          clearInterval(timer);
          resolve();
        }
      }, 14);
    });
  }

  async function sendMessage(extraContext?: string) {
    if (!canSend && !extraContext) return;

    if (chatFull) {
      await streamAssistantMessage(
        "Fehler: Dieser Chat ist voll. Bitte starte links einen neuen Chat."
      );
      return;
    }

    const text = extraContext ? `${input}\n\n${extraContext}` : input.trim();
    const content =
      text ||
      (pendingImage ? "Beschreibe dieses Bild und antworte auf meine Frage dazu." : "");

    const userMessage: ChatMessage = {
      role: "user",
      content,
      ...(pendingImage
        ? {
            images: [pendingImage.base64],
            imageName: pendingImage.name,
            imageCategory: categorizeUploadedImage(pendingImage.name, content)
          }
        : {})
    };

    const next: ChatMessage[] = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setPendingImage(null);
    setShowWelcome(false);
    setLoadingHint(
      wantsImageGeneration(content) ? "Bild wird erstellt..." : "KI schreibt..."
    );
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ...(activeConversationId ? { conversationId: activeConversationId } : {}),
          messages: messagesForRequest(
            next.filter(
              (m) => m.content.trim().length > 0 || (m.images && m.images.length > 0)
            )
          )
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || "Serverfehler bei der KI-Antwort.";
        setMessages((prev) => prev.slice(0, -1));
        await streamAssistantMessage(`Fehler: ${message}`);
        if (res.status === 429) {
          window.dispatchEvent(new Event("mekkz-plan-refresh"));
        }
        return;
      }

      if (data.conversationLimit) {
        setChatLimit(data.conversationLimit);
      }

      if (data.conversationId && data.conversationId !== activeConversationId) {
        setActiveConversationId(data.conversationId);
      }

      const aiContent =
        data.reply ??
        (data.generatedImage ? "" : "Keine Antwort erhalten.");
      await streamAssistantMessage(aiContent, data.generatedImage, data.imageCategory);

      setMessages((prev) => {
        const copy = [...prev];
        const userIndex = copy.length - 2;
        if (data.userImage && copy[userIndex]?.role === "user") {
          copy[userIndex] = {
            ...copy[userIndex],
            images: [data.userImage],
            ...(data.imageCategory ? { imageCategory: data.imageCategory } : {})
          };
        } else if (data.imageCategory && copy[userIndex]?.role === "user") {
          copy[userIndex] = { ...copy[userIndex], imageCategory: data.imageCategory };
        }
        return copy;
      });
      await loadConversations();
      window.dispatchEvent(new Event("mekkz-plan-refresh"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.";
      await streamAssistantMessage(`Fehler: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function onFileSelected(file?: File) {
    if (!file) return;

    if (isImageFile(file)) {
      try {
        const base64 = await compressImageToBase64(file);
        setPendingImage({
          base64,
          name: file.name,
          preview: `data:image/jpeg;base64,${base64}`
        });
      } catch {
        await streamAssistantMessage("Fehler: Bild konnte nicht geladen werden.");
      }
      return;
    }

    const text = await file.text();
    await sendMessage(`Dateikontext (${file.name}):\n${text.slice(0, 8000)}`);
  }

  function startVoiceInput() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "de-DE";
    recognition.onresult = (event: any) => {
      setInput((prev) => `${prev} ${event.results[0][0].transcript}`.trim());
    };
    recognition.start();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <WavyBackground>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userId={userId}
        userEmail={userEmail}
        onLogout={() => void handleLogout()}
      />
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1600px] flex-col gap-3 p-3 md:flex-row lg:gap-4 lg:p-4">
        <aside className="glass flex max-h-56 shrink-0 flex-col rounded-2xl p-4 md:h-full md:max-h-none md:w-80 lg:w-96">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">mekkz AI</h2>
          </div>

          <button
            onClick={() => void startNewChat()}
            className="btn-primary mb-4 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:opacity-90"
          >
            <MessageSquarePlus size={16} />
            Neuer Chat
          </button>

          <p className="mb-2 text-xs uppercase tracking-wide text-muted">Gespeicherte Chats</p>
          <div className="flex-1 space-y-1 overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted">Noch keine Chats</p>
            ) : (
              conversations.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-stretch gap-1 rounded-xl transition ${
                    chat.id === activeConversationId
                      ? "chat-item-active"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void selectConversation(chat.id)}
                    disabled={deletingConversationId === chat.id}
                    className="min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm disabled:opacity-50"
                  >
                    <span className="line-clamp-2">{chat.title}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Chat „${chat.title}“ löschen`}
                    disabled={deletingConversationId === chat.id}
                    onClick={() => void deleteConversation(chat.id)}
                    className="mr-1 shrink-0 self-center rounded-lg p-1.5 text-muted opacity-70 transition hover:bg-white/10 hover:text-fg hover:opacity-100 disabled:opacity-40 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <PlanUpgrade userId={userId} />
        </aside>

        <section className="glass flex min-h-0 min-h-[52dvh] flex-1 flex-col rounded-2xl md:min-h-0">
          <header className="flex items-center justify-between border-b border-white/10 p-4">
            <h1 className="text-lg font-semibold">AI Chat</h1>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Einstellungen"
              className="glass rounded-xl p-2 transition hover:scale-105"
            >
              <Settings size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-5 lg:p-6">
            {loadError ? (
              <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p>
            ) : null}
            {showWelcome && messages.length === 0 ? (
              <div className="mx-auto max-w-md space-y-3 py-8 text-center">
                <p className="text-lg font-semibold">Willkommen bei mekkz AI</p>
                <p className="text-sm text-muted">
                  Sende eine Nachricht an mekkz AI, um zu starten.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted">
                Wähle einen gespeicherten Chat links.
              </p>
            ) : null}
            <AnimatePresence>
              {messages.map((m, i) => {
                const isGeneratedImageMessage =
                  m.role === "assistant" && Boolean(m.generatedImage);
                const categoryMeta = getCategoryMeta(m.imageCategory);
                const showCategory = Boolean(m.imageCategory) && !isGeneratedImageMessage;
                const showContent = Boolean(m.content.trim()) && !isGeneratedImageMessage;

                return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[min(100%,52rem)] rounded-2xl border p-3 md:p-4 ${
                    showCategory ? categoryMeta.borderClass : "border-transparent"
                  } ${
                    m.role === "user" ? "chat-bubble-user ml-auto" : "chat-bubble-ai"
                  }`}
                >
                  {showCategory ? <ImageCategoryBadge category={m.imageCategory} /> : null}
                  {m.images?.[0] ? (
                    <img
                      src={resolveChatImageSrc(m.images[0])}
                      alt={m.imageName || "Hochgeladenes Bild"}
                      className="mb-2 max-h-56 w-full rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  {m.generatedImage ? (
                    <img
                      src={resolveChatImageSrc(m.generatedImage)}
                      alt="Generiertes Bild"
                      className={`max-h-72 w-full rounded-xl object-contain ${
                        showContent ? "mb-2" : ""
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  {showContent ? (
                    m.role === "assistant" && m.content.includes("**Kategorie:**") ? (
                      <StructuredAnalysis content={m.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )
                  ) : null}
                </motion.div>
              );
              })}
            </AnimatePresence>
            {isLoading ? <p className="text-sm text-muted">{loadingHint}</p> : null}
            <div ref={bottomRef} />
          </div>

          <footer className="border-t border-white/10 p-4 md:p-5">
            {hasFiniteChatLimit(chatLimit) ? (
              <p
                className={`mb-3 text-xs ${
                  chatLimit.remaining <= 5 ? "text-amber-200" : "text-muted"
                }`}
              >
                {chatLimit.remaining > 0
                  ? `Noch ${chatLimit.remaining} von ${chatLimit.limit} Nachrichten in diesem Chat`
                  : `Chat-Limit erreicht (${chatLimit.limit} Nachrichten). Starte einen neuen Chat.`}
              </p>
            ) : null}
            {pendingImage ? (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2">
                <img
                  src={pendingImage.preview}
                  alt="Vorschau"
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <ImageCategoryBadge
                    category={categorizeUploadedImage(pendingImage.name, input)}
                  />
                  <div className="text-sm text-muted">{pendingImage.name}</div>
                </div>
                <button
                  onClick={() => setPendingImage(null)}
                  className="rounded-lg bg-white/10 px-3 py-1 text-sm"
                >
                  Entfernen
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-xl bg-white/10 p-3"
              >
                <Paperclip size={18} />
              </button>
              <button onClick={startVoiceInput} className="rounded-xl bg-white/10 p-3">
                <Mic size={18} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nachricht an mekkz AI senden..."
                className="flex-1 rounded-xl bg-white/10 p-3"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!canSend}
                className="rounded-xl btn-primary p-3 disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.txt,.md,.json,.csv,.pdf"
              className="hidden"
              onChange={(e) => {
                onFileSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </footer>
        </section>
      </div>
    </WavyBackground>
  );
}
