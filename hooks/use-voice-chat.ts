"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeechLocale, type LanguageCode } from "@/lib/languages";

type UseVoiceChatOptions = {
  language: LanguageCode;
  enabled: boolean;
  voiceOutputEnabled: boolean;
  autoSend: boolean;
  onTranscript?: (text: string) => void;
  onAutoSend?: (text: string) => void;
  disabled?: boolean;
};

export function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  };
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
}

export function useVoiceChat({
  language,
  enabled,
  voiceOutputEnabled,
  autoSend,
  onTranscript,
  onAutoSend,
  disabled = false
}: UseVoiceChatOptions) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const finalBufferRef = useRef("");

  const speechLocale = getSpeechLocale(language);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()) && "speechSynthesis" in window);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceOutputEnabled || !text.trim()) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = speechLocale;
      utterance.rate = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [speechLocale, stopSpeaking, voiceOutputEnabled]
  );

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    if (disabled || !enabled) return;

    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      setSupported(false);
      return;
    }

    stopSpeaking();
    finalBufferRef.current = "";

    const recognition = new SR();
    recognition.lang = speechLocale;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      shouldRestartRef.current = true;
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText("");
      if (shouldRestartRef.current && enabled && !disabled) {
        try {
          recognition.start();
        } catch {
          // Ignore restart races when recognition is already active.
        }
      }
    };

    recognition.onerror = () => {
      setListening(false);
      shouldRestartRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimText(interim.trim());
      }

      if (finalChunk.trim()) {
        finalBufferRef.current = `${finalBufferRef.current} ${finalChunk}`.trim();
        onTranscript?.(finalBufferRef.current);
        setInterimText("");

        if (autoSend && onAutoSend) {
          const text = finalBufferRef.current;
          finalBufferRef.current = "";
          shouldRestartRef.current = false;
          recognition.stop();
          onAutoSend(text);
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setSupported(false);
    }
  }, [autoSend, disabled, enabled, onAutoSend, onTranscript, speechLocale, stopSpeaking]);

  const toggleVoiceMode = useCallback(
    (next?: boolean) => {
      const shouldListen = typeof next === "boolean" ? next : !listening;
      if (shouldListen) {
        startListening();
      } else {
        stopListening();
      }
    },
    [listening, startListening, stopListening]
  );

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    supported,
    listening,
    speaking,
    interimText,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    toggleVoiceMode
  };
}
