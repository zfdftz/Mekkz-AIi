"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Menu, MessageSquarePlus, Mic, MicOff, Paperclip, Send, Settings, Square, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsPanel } from "./settings-panel";
import { ChatMessage, Conversation } from "@/lib/types";
import { messagesForRequest } from "@/lib/chat-storage";
import { categorizeUploadedImage } from "@/lib/image-categories";
import { ImageCategoryBadge } from "./image-message-parts";
import { extractImagePrompt, wantsImageGeneration } from "@/lib/image-intent";
import { ChatImage } from "./chat-image";
import { compressImageToBase64, isImageFile } from "@/lib/image-utils";
import { readJsonResponse } from "@/lib/fetch-json";
import { isChatStreamResponse, readChatStream } from "@/lib/chat-stream";
import { createClient } from "@/lib/supabase/client";
import { WavyBackground } from "./wavy-background";
import { AuthRequiredModal } from "./auth-required-modal";
import { MekkzLogo } from "./mekkz-logo";
import { PlanUpgrade, type PlanState } from "./plan-upgrade";
import { PLANS, type PlanId } from "@/lib/plans";
import { useLanguage } from "@/components/language-provider";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import type { UserAiPreferences } from "@/lib/user-ai-preferences";

type ChatApiResponse = {
  error?: string;
  code?: string;
  reply?: string;
  generatedImage?: string;
  imageGenPrompt?: string;
  userImage?: string;
  imageCategory?: string;
  conversationId?: string;
  plan?: PlanState;
  conversationLimit?: ConversationLimit;
};

type ConversationsResponse = { error?: string; conversations?: Conversation[] };
type HistoryResponse = {
  error?: string;
  messages?: ChatMessage[];
  conversationLimit?: ConversationLimit | null;
};
type ConversationCreateResponse = { error?: string; conversation?: Conversation };

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

function syncPlanBadge(plan?: PlanState) {
  if (plan?.plan) {
    window.dispatchEvent(new CustomEvent("mekkz-plan-update", { detail: plan }));
    return;
  }
  window.dispatchEvent(new Event("mekkz-plan-refresh"));
}

export function ChatUI({
  userId,
  userEmail = "",
  isGuest = false
}: {
  userId: string;
  userEmail?: string;
  isGuest?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const { language, t } = useLanguage();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalDescription, setAuthModalDescription] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    name: string;
    preview: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const streamRenderRef = useRef<number | null>(null);
  const streamScrollRef = useRef<number | null>(null);
  const pendingStreamTextRef = useRef("");
  const voiceModeRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loadingHint, setLoadingHint] = useState("");
  const [chatLimit, setChatLimit] = useState<ConversationLimit | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(
    null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [aiPreferences, setAiPreferences] = useState<UserAiPreferences>({
    personalityMode: "normal",
    tutorModeEnabled: false,
    tutorLevel: "intermediate",
    voiceOutputEnabled: false,
    voiceAutoSend: true,
    voiceGender: "female"
  });
  const sendMessageRef = useRef<(textOverride?: string) => Promise<void>>(async () => {});

  const chatFull = hasFiniteChatLimit(chatLimit) && chatLimit.remaining <= 0;

  useEffect(() => {
    setLoadingHint(t("chat.aiWriting"));
  }, [t]);

  useEffect(() => {
    async function loadPreferences() {
      const res = await fetch(`/api/ai-preferences?userId=${userId}`);
      const data = await readJsonResponse<{ preferences?: UserAiPreferences }>(res);
      if (res.ok && data.preferences) {
        setAiPreferences(data.preferences);
      }
    }

    void loadPreferences();

    function onPreferences(event: Event) {
      const detail = (event as CustomEvent<UserAiPreferences>).detail;
      if (detail) setAiPreferences(detail);
    }

    window.addEventListener("mekkz-ai-preferences", onPreferences);
    return () => window.removeEventListener("mekkz-ai-preferences", onPreferences);
  }, [userId]);

  const voice = useVoiceChat({
    language,
    voiceGender: aiPreferences.voiceGender,
    voiceMode,
    onTranscript: (text) => setInput(text),
    onAutoSend: (text) => {
      setInput(text);
      void sendMessageRef.current(text);
    },
    disabled: isLoading || chatFull
  });

  voiceModeRef.current = voiceMode;

  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  const canSend = useMemo(
    () => (input.trim().length > 0 || pendingImage) && !isLoading && !chatFull,
    [input, pendingImage, isLoading, chatFull]
  );

  const loadConversations = useCallback(async () => {
    const res = await fetch(`/api/conversations?userId=${userId}`);
    const data = await readJsonResponse<ConversationsResponse>(res);
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
      const data = await readJsonResponse<HistoryResponse>(res);
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
    const data = await readJsonResponse<ConversationCreateResponse>(res);
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
    setSidebarOpen(false);

    const limitRes = await fetch(
      `/api/history?userId=${userId}&conversationId=${created.id}`
    );
    const limitData = await readJsonResponse<HistoryResponse>(limitRes);
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

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollChatToBottom(isStreaming ? "auto" : "smooth");
  }, [messages.length, isLoading, isStreaming, scrollChatToBottom]);

  useEffect(() => {
    if (!isStreaming) return;
    if (streamScrollRef.current != null) {
      window.cancelAnimationFrame(streamScrollRef.current);
    }
    streamScrollRef.current = window.requestAnimationFrame(() => {
      scrollChatToBottom("auto");
      streamScrollRef.current = null;
    });
    return () => {
      if (streamScrollRef.current != null) {
        window.cancelAnimationFrame(streamScrollRef.current);
        streamScrollRef.current = null;
      }
    };
  }, [messages, isStreaming, scrollChatToBottom]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen((open) => !open);
  }

  async function selectConversation(conversationId: string) {
    if (conversationId === activeConversationId) {
      closeSidebar();
      return;
    }
    setActiveConversationId(conversationId);
    setInput("");
    setShowWelcome(false);
    await loadMessages(conversationId);
    closeSidebar();
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
      const data = await readJsonResponse<{ error?: string }>(res);

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
    imageCategory?: string,
    imageGenPrompt?: string,
    options?: { wordByWord?: boolean; onPartial?: (text: string) => void }
  ) {
    if (!fullText && !generatedImage) return;
    const wordByWord = options?.wordByWord ?? false;

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: wordByWord ? "" : fullText,
        ...(generatedImage ? { generatedImage } : {}),
        ...(imageGenPrompt ? { imageGenPrompt } : {}),
        ...(imageCategory ? { imageCategory } : {})
      }
    ]);

    if (!fullText) return;

    if (wordByWord) {
      const tokens = fullText.match(/\S+|\s+/g) ?? [fullText];
      let built = "";
      for (const token of tokens) {
        built += token;
        const partial = built;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: partial };
          }
          return copy;
        });
        if (/\S/.test(token)) {
          options?.onPartial?.(partial.trim());
          await new Promise((resolve) => window.setTimeout(resolve, 10));
        }
      }
      return;
    }

    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: fullText };
      }
      return copy;
    });
  }

  function openAuthRequired(description?: string) {
    setAuthModalDescription(description);
    setAuthModalOpen(true);
  }

  async function sendMessage(extraContext?: string, textOverride?: string) {
    const rawText = textOverride ?? (extraContext ? `${input}\n\n${extraContext}` : input.trim());
    const canProceed =
      (rawText.length > 0 || pendingImage) && !isLoading && !chatFull;
    if (!canProceed && !extraContext && !textOverride) return;

    if (chatFull) {
      await streamAssistantMessage(
        "Fehler: Dieser Chat ist voll. Bitte starte links einen neuen Chat."
      );
      return;
    }

    const text = rawText;
    const content = text;
    const isImageGenRequest = wantsImageGeneration(content) && !pendingImage;

    if (isGuest && (isImageGenRequest || pendingImage)) {
      openAuthRequired(
        "Als Gast kannst du chatten, aber keine Bilder erstellen oder senden. Melde dich an oder registriere dich — dauert nur eine Minute."
      );
      return;
    }

    if (isImageGenRequest) {
      const planRes = await fetch(`/api/plan?userId=${userId}&_=${Date.now()}`, {
        cache: "no-store"
      });
      const planData = await readJsonResponse<{ plan?: PlanState; error?: string }>(planRes);
      if (planRes.ok && planData.plan) {
        const limit =
          PLANS[planData.plan.plan as PlanId].dailyImageLimit ?? planData.plan.dailyLimit;
        const used = planData.plan.imagesToday ?? 0;
        if (limit != null && used >= limit) {
          await streamAssistantMessage(
            `Tageslimit für Bild-Erstellung erreicht (${limit} Bilder). Morgen sind wieder neue Bilder verfügbar.`
          );
          return;
        }
      }
    }

    if (pendingImage) {
      const planRes = await fetch(`/api/plan?userId=${userId}&_=${Date.now()}`, {
        cache: "no-store"
      });
      const planData = await readJsonResponse<{ plan?: PlanState; error?: string }>(planRes);
      if (planRes.ok && planData.plan) {
        const uploadLimit =
          PLANS[planData.plan.plan as PlanId].dailyUploadLimit ??
          planData.plan.dailyUploadLimit;
        const uploadsToday = planData.plan.uploadsToday ?? 0;
        if (uploadLimit != null && uploadsToday >= uploadLimit) {
          await streamAssistantMessage(
            `Tageslimit für Bild-Uploads erreicht (${uploadLimit} Bilder). Morgen wieder verfügbar.`
          );
          return;
        }
      }
    }

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

    const imagePrompt = isImageGenRequest ? extractImagePrompt(content) : "";

    const next: ChatMessage[] = isImageGenRequest
      ? [
          ...messages,
          userMessage,
          {
            role: "assistant",
            content: t("chat.creatingImage"),
            imageGenPrompt: imagePrompt
          }
        ]
      : [...messages, userMessage];

    setMessages(next);
    setInput("");
    setPendingImage(null);
    setShowWelcome(false);
    if (voice.listening) {
      voice.stopListening();
    }
    setLoadingHint(
      isImageGenRequest ? t("chat.creatingImage") : t("chat.aiWriting")
    );
    setIsLoading(true);
    voice.setProcessing(true);
    try {
      const useStream = !isImageGenRequest;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          language,
          generateImage: isImageGenRequest,
          stream: useStream,
          ...(activeConversationId ? { conversationId: activeConversationId } : {}),
          messages: messagesForRequest(
            next.filter(
              (m) => m.content.trim().length > 0 || (m.images && m.images.length > 0)
            )
          )
        })
      });

      if (useStream && res.ok && isChatStreamResponse(res.headers.get("content-type"))) {
        setIsStreaming(true);
        voice.resetSpeech();
        let gotFirstDelta = false;

        await readChatStream(res, {
          onMeta: (event) => {
            if (event.conversationId && event.conversationId !== activeConversationId) {
              setActiveConversationId(event.conversationId);
            }
            if (event.userImage) {
              setMessages((prev) => {
                const copy = [...prev];
                const userIndex = copy.length - 1;
                if (copy[userIndex]?.role === "user") {
                  copy[userIndex] = {
                    ...copy[userIndex],
                    images: [event.userImage!]
                  };
                }
                return copy;
              });
            }
          },
          onDelta: (_chunk, fullText) => {
            if (!gotFirstDelta) {
              gotFirstDelta = true;
              setIsLoading(false);
            }
            pendingStreamTextRef.current = fullText;
            if (streamRenderRef.current != null) return;

            streamRenderRef.current = window.requestAnimationFrame(() => {
              const nextText = pendingStreamTextRef.current;
              streamRenderRef.current = null;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  const copy = [...prev];
                  copy[copy.length - 1] = { ...last, content: nextText };
                  return copy;
                }
                return [...prev, { role: "assistant", content: nextText }];
              });
              if (voiceModeRef.current) {
                voiceRef.current.feedAssistantText(nextText.trim());
              }
            });
          },
          onDone: (event) => {
            if (event.conversationLimit) {
              setChatLimit(event.conversationLimit);
            }
            if (event.conversationId && event.conversationId !== activeConversationId) {
              setActiveConversationId(event.conversationId);
            }
            setMessages((prev) => {
              const copy = [...prev];
              const assistantIndex = copy.length - 1;
              const userIndex = copy.length - 2;

              if (copy[assistantIndex]?.role === "assistant") {
                copy[assistantIndex] = {
                  ...copy[assistantIndex],
                  content: event.reply || copy[assistantIndex].content
                };
              }

              if (event.userImage && copy[userIndex]?.role === "user") {
                copy[userIndex] = {
                  ...copy[userIndex],
                  images: [event.userImage],
                  ...(event.imageCategory ? { imageCategory: event.imageCategory } : {})
                };
              } else if (event.imageCategory && copy[userIndex]?.role === "user") {
                copy[userIndex] = {
                  ...copy[userIndex],
                  imageCategory: event.imageCategory
                };
              }

              return copy;
            });
            syncPlanBadge(event.plan);
            void loadConversations();
          },
          onError: (message) => {
            throw new Error(message);
          }
        });

        if (!gotFirstDelta) {
          setIsLoading(false);
        }
        return;
      }

      const data = await readJsonResponse<ChatApiResponse>(res);
      if (!res.ok) {
        const message = data?.error || "Serverfehler bei der KI-Antwort.";
        if (res.status === 403 && data.code === "AUTH_REQUIRED") {
          openAuthRequired(message);
          if (isImageGenRequest) {
            setMessages((prev) => prev.slice(0, -2));
          } else {
            setMessages((prev) => prev.slice(0, -1));
          }
          return;
        }
        if (isImageGenRequest) {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = {
                ...last,
                content: message
              };
            }
            return copy;
          });
        } else {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && !last.content.trim()) {
              return prev.slice(0, -1);
            }
            return prev;
          });
          await streamAssistantMessage(`Fehler: ${message}`);
        }
        if (res.status === 429) {
          syncPlanBadge(data.plan);
        }
        return;
      }

      if (data.conversationLimit) {
        setChatLimit(data.conversationLimit);
      }

      if (data.conversationId && data.conversationId !== activeConversationId) {
        setActiveConversationId(data.conversationId);
      }

      if (isImageGenRequest) {
        setMessages((prev) => {
          const copy = [...prev];
          const assistantIndex = copy.length - 1;
          const userIndex = copy.length - 2;

          if (copy[assistantIndex]?.role === "assistant") {
            copy[assistantIndex] = {
              ...copy[assistantIndex],
              content: data.reply ?? "",
              generatedImage:
                data.generatedImage ?? copy[assistantIndex].generatedImage,
              imageGenPrompt: data.imageGenPrompt ?? imagePrompt
            };
          }

          if (data.userImage && copy[userIndex]?.role === "user") {
            copy[userIndex] = {
              ...copy[userIndex],
              images: [data.userImage]
            };
          }
          return copy;
        });
      } else {
        const aiContent =
          data.reply ??
          (data.generatedImage ? "" : "Keine Antwort erhalten.");
        voice.resetSpeech();
        await streamAssistantMessage(
          aiContent,
          data.generatedImage,
          data.imageCategory,
          data.imageGenPrompt,
          voiceMode
            ? {
                wordByWord: false,
                onPartial: (partial) => voice.feedAssistantText(partial)
              }
            : undefined
        );

        if (voiceMode && aiContent.trim()) {
          voice.feedAssistantText(aiContent.trim());
        }

        setMessages((prev) => {
          const copy = [...prev];
          const assistantIndex = copy.length - 1;
          const userIndex = copy.length - 2;

          if (copy[assistantIndex]?.role === "assistant") {
            copy[assistantIndex] = {
              ...copy[assistantIndex],
              content: data.reply ?? copy[assistantIndex].content,
              ...(data.generatedImage ? { generatedImage: data.generatedImage } : {}),
              ...(data.imageGenPrompt ? { imageGenPrompt: data.imageGenPrompt } : {}),
              ...(data.imageCategory && data.generatedImage
                ? { imageCategory: data.imageCategory }
                : {})
            };
          }

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
      }

      void loadConversations();
      syncPlanBadge(data.plan);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unbekannter Netzwerkfehler.";
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content.trim()) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      await streamAssistantMessage(`Fehler: ${message}`);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      if (voiceMode) {
        await voice.waitUntilSpeechDone();
      }
      voice.setProcessing(false);
    }
  }

  sendMessageRef.current = sendMessage;

  function toggleVoiceMode() {
    if (!voice.supported) return;
    setVoiceMode((prev) => !prev);
  }

  async function onFileSelected(file?: File) {
    if (!file) return;

    if (isImageFile(file)) {
      if (isGuest) {
        openAuthRequired(
          "Bilder senden geht erst nach der Anmeldung. Registriere dich oder logge dich ein."
        );
        return;
      }
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <WavyBackground>
      <div className="flex h-[100svh] max-h-[100svh] min-h-0 flex-col overflow-hidden">
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userId={userId}
        userEmail={userEmail}
        isGuest={isGuest}
        onLogin={() => router.push("/auth/login")}
        onLogout={() => void handleLogout()}
      />
      <div className="chat-mobile-shell relative mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-row gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 lg:gap-4 lg:p-4">
        <AnimatePresence>
          {sidebarOpen ? (
            <>
              <motion.button
                type="button"
                aria-label="Chat-Menü schließen"
                className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={closeSidebar}
              />
              <motion.aside
                aria-label="Gespeicherte Chats"
                className="glass fixed left-0 top-0 z-50 flex h-full w-[min(88vw,20rem)] max-w-[20rem] flex-col rounded-r-2xl border-r border-white/10 p-4 shadow-2xl sm:w-80 lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 320 }}
              >
                <ChatSidebarPanel
                  userId={userId}
                  isGuest={isGuest}
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  deletingConversationId={deletingConversationId}
                  onNewChat={() => void startNewChat()}
                  onSelectConversation={(id) => void selectConversation(id)}
                  onDeleteConversation={(id) => void deleteConversation(id)}
                  onClose={closeSidebar}
                  mobile
                />
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <aside className="glass hidden h-full min-h-0 shrink-0 flex-col rounded-2xl p-4 lg:flex lg:w-80 xl:w-96">
          <ChatSidebarPanel
            userId={userId}
            isGuest={isGuest}
            conversations={conversations}
            activeConversationId={activeConversationId}
            deletingConversationId={deletingConversationId}
            onNewChat={() => void startNewChat()}
            onSelectConversation={(id) => void selectConversation(id)}
            onDeleteConversation={(id) => void deleteConversation(id)}
          />
        </aside>

        <section className="glass flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl">
          <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:gap-3 sm:p-4">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? "Chat-Menü schließen" : "Chat-Menü öffnen"}
              aria-expanded={sidebarOpen}
              className="shrink-0 rounded-xl bg-white/10 p-2 transition hover:bg-white/15 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <MekkzLogo
              size={28}
              className="min-w-0 flex-1"
              textClassName="truncate text-sm font-semibold sm:text-base lg:text-lg"
            />
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Einstellungen"
              className="shrink-0 rounded-xl bg-white/10 p-2 transition hover:scale-105"
            >
              <Settings size={18} />
            </button>
          </header>

          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 sm:space-y-3 sm:p-4 lg:p-5 xl:p-6"
          >
            {loadError ? (
              <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p>
            ) : null}
            {showWelcome && messages.length === 0 ? (
              <div className="mx-auto max-w-md space-y-2 px-1 py-6 text-center sm:space-y-3 sm:py-8">
                <p className="text-base font-semibold sm:text-lg">{t("chat.welcomeTitle")}</p>
                <p className="mt-2 text-sm text-muted sm:text-base">{t("chat.welcome")}</p>
                <p className="text-xs text-muted sm:text-sm">{t("chat.welcomeHint")}</p>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs text-muted sm:text-sm">
                <span className="lg:hidden">Tippe oben links auf ☰ für deine Chats.</span>
                <span className="hidden lg:inline">Wähle einen gespeicherten Chat links.</span>
              </p>
            ) : null}
            {messages.map((m, i) => {
                const showContent = Boolean(m.content.trim());
                const isLiveAssistant =
                  isStreaming &&
                  i === messages.length - 1 &&
                  m.role === "assistant";

                return (
                <div
                  key={`${i}-${m.role}`}
                  className={`max-w-[min(92%,52rem)] rounded-xl border border-transparent p-2.5 text-sm sm:max-w-[min(88%,52rem)] sm:rounded-2xl sm:p-3 sm:text-base lg:max-w-[min(100%,52rem)] lg:p-4 ${
                    m.role === "user" ? "chat-bubble-user ml-auto" : "chat-bubble-ai"
                  }`}
                >
                  {m.images?.[0] ? (
                    <ChatImage
                      src={m.images[0]}
                      alt={m.imageName || "Hochgeladenes Bild"}
                      className="mb-2 max-h-40 w-full rounded-lg object-cover sm:max-h-56 sm:rounded-xl"
                    />
                  ) : null}
                  {m.generatedImage ? (
                    <ChatImage
                      src={m.generatedImage}
                      imageGenPrompt={m.imageGenPrompt}
                      alt="Generiertes Bild"
                      className={`max-h-48 w-full rounded-lg object-contain sm:max-h-72 sm:rounded-xl ${
                        showContent ? "mb-2" : ""
                      }`}
                    />
                  ) : null}
                  {showContent || isLiveAssistant ? (
                    <p className="whitespace-pre-wrap">
                      {m.content}
                      {isLiveAssistant ? (
                        <span className="ml-0.5 inline-block animate-pulse text-primary">▍</span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              );
              })}
            {voice.micError ? (
              <p className="text-sm text-red-200">{voice.micError}</p>
            ) : null}
            {voiceMode && voice.listening ? (
              <p className="text-sm text-emerald-200">{t("voice.listening")}</p>
            ) : null}
            {voice.speaking ? (
              <p className="text-sm text-violet-200">{t("voice.speaking")}</p>
            ) : null}
          </div>

          <footer className="shrink-0 border-t border-white/10 p-2.5 sm:p-4 lg:p-5">
            {isLoading ? (
              <p className="mb-2 text-sm text-muted">{loadingHint}</p>
            ) : null}
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
            <div className="chat-mobile-input-tools flex min-w-0 items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => {
                  if (isGuest) {
                    openAuthRequired(
                      "Bilder senden geht erst nach der Anmeldung. Registriere dich oder logge dich ein."
                    );
                    return;
                  }
                  fileRef.current?.click();
                }}
                className="shrink-0 rounded-xl bg-white/10 p-2.5 lg:p-3"
                aria-label="Datei anhängen"
              >
                <Paperclip size={18} />
              </button>
              <button
                onClick={toggleVoiceMode}
                disabled={!voice.supported}
                className={`shrink-0 rounded-xl p-2.5 lg:p-3 ${
                  voiceMode ? "bg-emerald-500/25 text-emerald-100 ring-2 ring-emerald-400/40" : "bg-white/10"
                } disabled:opacity-40`}
                aria-label={t("voice.mode")}
                title={voice.supported ? t("voice.mode") : t("voice.unavailable")}
              >
                {voiceMode ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              {voice.speaking ? (
                <button
                  onClick={voice.stopSpeaking}
                  className="shrink-0 rounded-xl bg-red-500/20 p-2.5 text-red-100 lg:p-3"
                  aria-label={t("voice.stop")}
                >
                  <Square size={16} fill="currentColor" />
                </button>
              ) : null}
              <input
                value={voice.interimText || input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isGuest ? t("chat.guestPlaceholder") : t("chat.messagePlaceholder")
                }
                className="min-w-0 flex-1 rounded-xl bg-white/10 p-2.5 text-sm placeholder:text-muted sm:p-3 sm:text-base"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                readOnly={Boolean(voice.interimText)}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!canSend && !voice.interimText}
                className="shrink-0 rounded-xl btn-primary p-2.5 disabled:opacity-50 lg:p-3"
                aria-label="Senden"
              >
                <Send size={18} />
              </button>
            </div>
            {!voice.supported ? (
              <p className="mt-2 text-xs text-muted">{t("voice.unavailable")}</p>
            ) : null}
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
      <AuthRequiredModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        description={authModalDescription}
      />
      </div>
    </WavyBackground>
  );
}

function ChatSidebarPanel({
  userId,
  isGuest = false,
  conversations,
  activeConversationId,
  deletingConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onClose,
  mobile = false
}: {
  userId: string;
  isGuest?: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  deletingConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <>
      <div className={`mb-4 flex items-center justify-between gap-2 ${mobile ? "" : "lg:mb-4"}`}>
        <MekkzLogo size={32} textClassName="text-base font-semibold lg:text-lg" />
        {mobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Menü schließen"
            className="rounded-lg bg-white/10 p-2 transition hover:bg-white/15"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className="btn-primary mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:opacity-90"
      >
        <MessageSquarePlus size={16} />
        {t("chat.newChat")}
      </button>

      <Link
        href="/tools"
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium transition hover:bg-white/10"
      >
        <Wrench size={16} />
        AI Tools
      </Link>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Gespeicherte Chats</p>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
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
                onClick={() => onSelectConversation(chat.id)}
                disabled={deletingConversationId === chat.id}
                className="min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm disabled:opacity-50"
              >
                <span className="line-clamp-2">{chat.title}</span>
              </button>
              <button
                type="button"
                aria-label={`Chat „${chat.title}“ löschen`}
                disabled={deletingConversationId === chat.id}
                onClick={() => onDeleteConversation(chat.id)}
                className="mr-1 shrink-0 self-center rounded-lg p-1.5 text-muted opacity-100 transition hover:bg-white/10 hover:text-fg disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <PlanUpgrade userId={userId} isGuest={isGuest} />
    </>
  );
}
