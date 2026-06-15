"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeechLocale, type LanguageCode } from "@/lib/languages";
import { StreamingTTS } from "@/lib/voice/streaming-tts";
import { normalizeVoiceGender, type VoiceGender } from "@/lib/voice/speech-voices";

type UseVoiceChatOptions = {
  language: LanguageCode;
  voiceGender: VoiceGender;
  voiceMode: boolean;
  disabled?: boolean;
  onTranscript?: (text: string) => void;
  onAutoSend?: (text: string) => void;
};

export function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  };
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
}

async function requestMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export function useVoiceChat({
  language,
  voiceGender,
  voiceMode,
  disabled = false,
  onTranscript,
  onAutoSend
}: UseVoiceChatOptions) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const finalBufferRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const ttsRef = useRef<StreamingTTS | null>(null);
  const processingRef = useRef(false);

  const speechLocale = getSpeechLocale(language);
  const gender = normalizeVoiceGender(voiceGender);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()) && "speechSynthesis" in window);
    ttsRef.current = new StreamingTTS();
    return () => {
      ttsRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    void ttsRef.current?.configure(speechLocale, gender);
  }, [speechLocale, gender]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current != null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const flushAndSend = useCallback(() => {
    const text = finalBufferRef.current.trim();
    if (!text || processingRef.current) return;
    finalBufferRef.current = "";
    setInterimText("");
    clearSilenceTimer();
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    onAutoSend?.(text);
  }, [clearSilenceTimer, onAutoSend]);

  const scheduleSilenceSend = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      if (finalBufferRef.current.trim()) {
        flushAndSend();
      }
    }, 1400);
  }, [clearSilenceTimer, flushAndSend]);

  const stopSpeaking = useCallback(() => {
    ttsRef.current?.stop();
    setSpeaking(false);
  }, []);

  const resetSpeech = useCallback(() => {
    ttsRef.current?.reset();
    setSpeaking(false);
  }, []);

  const waitUntilSpeechDone = useCallback(async () => {
    while (ttsRef.current?.isActive) {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }
    setSpeaking(false);
  }, []);

  const feedAssistantText = useCallback((cumulativeText: string) => {
    if (!voiceMode) return;
    ttsRef.current?.feed(cumulativeText);
    setSpeaking(true);
    const check = () => {
      if (!ttsRef.current?.isActive) {
        setSpeaking(false);
      } else {
        window.setTimeout(check, 120);
      }
    };
    window.setTimeout(check, 120);
  }, [voiceMode]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    clearSilenceTimer();
    recognitionRef.current?.stop();
    setListening(false);
    setInterimText("");
  }, [clearSilenceTimer]);

  const startListening = useCallback(async () => {
    if (disabled || !voiceMode || processingRef.current) return;

    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      setSupported(false);
      setMicError("Spracherkennung wird in diesem Browser nicht unterstützt.");
      return;
    }

    const micOk = await requestMicrophoneAccess();
    if (!micOk) {
      setMicError("Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.");
      return;
    }

    setMicError(null);
    stopSpeaking();
    finalBufferRef.current = "";

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const recognition = new SR();
    recognition.lang = speechLocale;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      shouldListenRef.current = true;
    };

    recognition.onend = () => {
      setListening(false);
      if (shouldListenRef.current && voiceMode && !disabled && !processingRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // ignore restart race
          }
        }, 250);
      }
    };

    recognition.onerror = (event) => {
      const code = (event as SpeechRecognitionErrorEvent).error;
      if (code === "not-allowed") {
        setMicError("Mikrofon blockiert — bitte Berechtigung erlauben.");
        shouldListenRef.current = false;
        setListening(false);
        return;
      }
      if (code === "aborted") return;
      if (code === "no-speech") {
        scheduleSilenceSend();
        return;
      }
      setMicError(`Sprachfehler: ${code}`);
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

      if (interim.trim()) {
        setInterimText(`${finalBufferRef.current} ${interim}`.trim());
      }

      if (finalChunk.trim()) {
        finalBufferRef.current = `${finalBufferRef.current} ${finalChunk}`.trim();
        onTranscript?.(finalBufferRef.current);
        setInterimText(finalBufferRef.current);
        scheduleSilenceSend();
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    try {
      recognition.start();
    } catch {
      setMicError("Mikrofon konnte nicht gestartet werden.");
    }
  }, [
    disabled,
    onTranscript,
    scheduleSilenceSend,
    speechLocale,
    stopSpeaking,
    voiceMode
  ]);

  const setProcessing = useCallback(
    (value: boolean) => {
      processingRef.current = value;
      if (value) {
        stopListening();
      } else if (voiceMode && !disabled) {
        void startListening();
      }
    },
    [disabled, startListening, stopListening, voiceMode]
  );

  useEffect(() => {
    if (voiceMode && !disabled && !processingRef.current) {
      void startListening();
    } else if (!voiceMode) {
      stopListening();
      stopSpeaking();
    }
  }, [voiceMode, disabled, startListening, stopListening, stopSpeaking]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      clearSilenceTimer();
      recognitionRef.current?.stop();
      ttsRef.current?.stop();
    };
  }, [clearSilenceTimer]);

  return {
    supported,
    listening,
    speaking,
    interimText,
    micError,
    stopSpeaking,
    resetSpeech,
    feedAssistantText,
    waitUntilSpeechDone,
    startListening,
    stopListening,
    setProcessing
  };
}
