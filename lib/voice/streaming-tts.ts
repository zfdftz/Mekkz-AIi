import { loadSpeechVoices, pickSpeechVoice, type VoiceGender } from "./speech-voices";

/** ChatGPT-style: speak phrase chunks as assistant text grows. */
export class StreamingTTS {
  private queue: string[] = [];
  private speaking = false;
  private spokenWordCount = 0;
  private stopped = false;
  private voice: SpeechSynthesisVoice | null = null;
  private locale = "de-DE";
  private gender: VoiceGender = "female";

  async configure(locale: string, gender: VoiceGender) {
    this.locale = locale;
    this.gender = gender;
    const voices = await loadSpeechVoices();
    this.voice = pickSpeechVoice(voices, locale, gender);
  }

  reset() {
    this.stop();
    this.spokenWordCount = 0;
    this.queue = [];
    this.stopped = false;
  }

  stop() {
    this.stopped = true;
    this.queue = [];
    this.speaking = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /** Feed cumulative assistant text; only new phrase chunks are queued. */
  feed(cumulativeText: string) {
    if (this.stopped || !cumulativeText.trim()) return;
    const words = cumulativeText.match(/\S+/g) ?? [];

    while (this.spokenWordCount < words.length) {
      const remaining = words.length - this.spokenWordCount;
      const chunkSize =
        remaining <= 3 ? remaining : remaining > 12 ? 5 : Math.min(4, remaining);
      const chunk = words
        .slice(this.spokenWordCount, this.spokenWordCount + chunkSize)
        .join(" ");
      this.queue.push(chunk);
      this.spokenWordCount += chunkSize;
    }

    void this.drain();
  }

  private async drain() {
    if (this.speaking || this.queue.length === 0) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    this.speaking = true;
    const phrase = this.queue.shift()!;
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = this.locale;
    utterance.rate = 1;
    utterance.pitch = this.gender === "female" ? 1.02 : 0.96;
    if (this.voice) utterance.voice = this.voice;

    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });

    this.speaking = false;
    if (!this.stopped) {
      void this.drain();
    }
  }

  get isActive() {
    return this.speaking || this.queue.length > 0;
  }
}
