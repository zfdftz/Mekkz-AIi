"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeechLocale, type LanguageCode } from "@/lib/languages";
import { translate } from "@/lib/i18n/messages";
import { canUseMediaRecorderStt, MediaRecorderStt } from "@/lib/voice/media-recorder-stt";
import { checkMicrophoneAvailability } from "@/lib/voice/microphone";
import { StreamingTTS } from "@/lib/voice/streaming-tts";
import { normalizeVoiceGender, type VoiceGender } from "@/lib/voice/speech-voices";

type UseVoiceChatOptions = {
  language: LanguageCode;
  voiceGender: VoiceGender;
  voiceMode: boolean;
  voiceAutoSend?: boolean;
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

function canUseNativeStt() {
  return Boolean(getSpeechRecognitionCtor());
}

function canUseVoiceChat() {
  if (typeof window === "undefined") return false;
  const hasStt = canUseNativeStt() || canUseMediaRecorderStt();
  const hasTts = "speechSynthesis" in window;
  return hasStt && hasTts;
}

async function requestMicrophoneAccess() {
  const result = await checkMicrophoneAvailability();
  if (!result.ok) {
    return { ok: false as const, message: result.message };
  }
  return { ok: true as const };
}

export function useVoiceChat({
  language,
  voiceGender,
  voiceMode,
  voiceAutoSend = true,
  disabled = false,
  onTranscript,
  onAutoSend
}: UseVoiceChatOptions) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessingState] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaSttRef = useRef<MediaRecorderStt | null>(null);
  const shouldListenRef = useRef(false);
  const finalBufferRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const ttsRef = useRef<StreamingTTS | null>(null);
  const processingRef = useRef(false);
  const voiceModeRef = useRef(voiceMode);

  const speechLocale = getSpeechLocale(language);
  const gender = normalizeVoiceGender(voiceGender);

  voiceModeRef.current = voiceMode;

  useEffect(() => {
    setSupported(canUseVoiceChat());
    ttsRef.current = new StreamingTTS();
    return () => {
      ttsRef.current?.stop();
      mediaSttRef.current?.stop();
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
    mediaSttRef.current?.stop();
    onAutoSend?.(text);
  }, [clearSilenceTimer, onAutoSend]);

  const scheduleSilenceSend = useCallback(() => {
    if (!voiceAutoSend) return;
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      if (finalBufferRef.current.trim()) {
        flushAndSend();
      }
    }, 1200);
  }, [clearSilenceTimer, flushAndSend, voiceAutoSend]);

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
    if (!voiceModeRef.current) return;
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
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    clearSilenceTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    mediaSttRef.current?.stop();
    mediaSttRef.current = null;
    setListening(false);
    setInterimText("");
  }, [clearSilenceTimer]);

  const startNativeListening = useCallback(async () => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) return false;

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
      if (shouldListenRef.current && voiceModeRef.current && !disabled && !processingRef.current) {
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

      if ((interim.trim() || finalChunk.trim()) && ttsRef.current?.isActive) {
        stopSpeaking();
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
      return true;
    } catch {
      return false;
    }
  }, [disabled, onTranscript, scheduleSilenceSend, speechLocale, stopSpeaking]);

  const startServerListening = useCallback(async () => {
    mediaSttRef.current?.stop();

    const stt = new MediaRecorderStt({
      language: speechLocale,
      transcribingLabel: translate(language, "voice.transcribing"),
      onListeningChange: setListening,
      onInterim: setInterimText,
      onSpeechStart: stopSpeaking,
      onTranscript: (text) => {
        finalBufferRef.current = `${finalBufferRef.current} ${text}`.trim();
        onTranscript?.(finalBufferRef.current);
        setInterimText(finalBufferRef.current);
        scheduleSilenceSend();
      },
      onError: (message) => setMicError(message)
    });

    mediaSttRef.current = stt;
    shouldListenRef.current = true;
    await stt.start();
  }, [language, onTranscript, scheduleSilenceSend, speechLocale, stopSpeaking]);

  const startListening = useCallback(
    async (fromUserGesture = false) => {
      if (disabled || (!voiceModeRef.current && !fromUserGesture) || processingRef.current) {
        return;
      }

      if (!canUseVoiceChat()) {
        setSupported(false);
        setMicError("Sprachmodus wird in diesem Browser nicht unterstützt.");
        return;
      }

      const mic = await requestMicrophoneAccess();
      if (!mic.ok) {
        setMicError(mic.message);
        return;
      }

      setMicError(null);
      stopSpeaking();
      finalBufferRef.current = "";

      if (canUseNativeStt()) {
        const started = await startNativeListening();
        if (started) return;
      }

      if (canUseMediaRecorderStt()) {
        try {
          await startServerListening();
          return;
        } catch (error) {
          setMicError(
            error instanceof Error
              ? error.message
              : "Mikrofon konnte nicht gestartet werden."
          );
          return;
        }
      }

      setSupported(false);
      setMicError("Spracherkennung ist in diesem Browser nicht verfügbar.");
    },
    [disabled, startNativeListening, startServerListening, stopSpeaking]
  );

  const setProcessing = useCallback(
    (value: boolean) => {
      processingRef.current = value;
      setProcessingState(value);
      if (value) {
        stopListening();
      } else if (voiceModeRef.current && !disabled) {
        void startListening();
      }
    },
    [disabled, startListening, stopListening]
  );

  useEffect(() => {
    if (!voiceMode) {
      stopListening();
      stopSpeaking();
    }
  }, [voiceMode, stopListening, stopSpeaking]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      clearSilenceTimer();
      recognitionRef.current?.stop();
      mediaSttRef.current?.stop();
      ttsRef.current?.stop();
    };
  }, [clearSilenceTimer]);

  return {
    supported,
    listening,
    speaking,
    processing,
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
