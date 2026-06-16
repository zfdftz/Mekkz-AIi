type MediaRecorderSttOptions = {
  language: string;
  transcribingLabel?: string;
  onListeningChange: (listening: boolean) => void;
  onInterim: (text: string) => void;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onSpeechStart?: () => void;
};

const SILENCE_MS = 1200;
const MIN_SPEECH_MS = 350;
const SPEECH_THRESHOLD = 0.012;

function pickRecorderMimeType() {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    ""
  ];
  for (const type of candidates) {
    if (!type || MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function extensionForMime(mime: string) {
  if (mime.includes("mp4") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export class MediaRecorderStt {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private monitorFrame: number | null = null;
  private silenceTimer: number | null = null;
  private active = false;
  private recording = false;
  private hadSpeech = false;
  private speechStartedAt = 0;
  private transcribing = false;
  private readonly mimeType: string;

  constructor(private readonly options: MediaRecorderSttOptions) {
    this.mimeType = pickRecorderMimeType();
  }

  private clearSilenceTimer() {
    if (this.silenceTimer != null) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private scheduleSilenceFlush() {
    this.clearSilenceTimer();
    this.silenceTimer = window.setTimeout(() => {
      void this.flushRecording();
    }, SILENCE_MS);
  }

  private readVolume() {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const sample of data) {
      const normalized = (sample - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / data.length);
  }

  private beginRecording() {
    if (!this.stream || this.recording || this.transcribing) return;
    this.chunks = [];
    const recorder = this.mimeType
      ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
      : new MediaRecorder(this.stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    recorder.start(250);
    this.recorder = recorder;
    this.recording = true;
    this.hadSpeech = true;
    this.speechStartedAt = Date.now();
  }

  private stopRecorder() {
    if (!this.recorder || !this.recording) return Promise.resolve<Blob | null>(null);

    const recorder = this.recorder;
    this.recording = false;
    this.recorder = null;

    return new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        if (this.chunks.length === 0) {
          resolve(null);
          return;
        }
        resolve(new Blob(this.chunks, { type: recorder.mimeType || this.mimeType || "audio/webm" }));
      };
      try {
        recorder.stop();
      } catch {
        resolve(null);
      }
    });
  }

  private async flushRecording() {
    if (this.transcribing) return;
    const blob = await this.stopRecorder();
    this.hadSpeech = false;
    this.clearSilenceTimer();

    if (!blob || blob.size < 800) return;
    if (Date.now() - this.speechStartedAt < MIN_SPEECH_MS) return;

    this.transcribing = true;
    this.options.onInterim(this.options.transcribingLabel ?? "…");

    try {
      const ext = extensionForMime(blob.type);
      const form = new FormData();
      form.append("audio", blob, `speech.${ext}`);
      form.append("locale", this.options.language);

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: form
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Transkription fehlgeschlagen.");
      }
      if (data.text?.trim()) {
        this.options.onTranscript(data.text.trim());
      }
    } catch (error) {
      this.options.onError(
        error instanceof Error ? error.message : "Transkription fehlgeschlagen."
      );
    } finally {
      this.transcribing = false;
      if (this.active) {
        this.options.onInterim("");
      }
    }
  }

  private monitor = () => {
    if (!this.active) return;
    const volume = this.readVolume();
    const speaking = volume > SPEECH_THRESHOLD;

    if (speaking) {
      if (!this.recording && !this.transcribing) {
        this.options.onSpeechStart?.();
        this.beginRecording();
      }
      this.clearSilenceTimer();
    } else if (this.recording && this.hadSpeech) {
      this.scheduleSilenceFlush();
    }

    this.monitorFrame = window.requestAnimationFrame(this.monitor);
  };

  async start() {
    if (this.active) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      throw new Error("Mikrofon-Aufnahme wird in diesem Browser nicht unterstützt.");
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    this.active = true;
    this.options.onListeningChange(true);
    this.monitorFrame = window.requestAnimationFrame(this.monitor);
  }

  stop() {
    this.active = false;
    this.clearSilenceTimer();
    if (this.monitorFrame != null) {
      window.cancelAnimationFrame(this.monitorFrame);
      this.monitorFrame = null;
    }
    void this.stopRecorder();
    this.recorder = null;
    this.chunks = [];
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.options.onListeningChange(false);
  }
}

export function canUseMediaRecorderStt() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia)
  );
}
