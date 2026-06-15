export type VoiceGender = "female" | "male";

const FEMALE_HINT =
  /female|woman|weiblich|zira|samantha|anna|helena|katja|petra|victoria|fiona|hazel|susan|linda|aria|jenny|michelle|emma|sara|maria|nina|lisa|julia|standard-a/i;
const MALE_HINT =
  /male|man|männlich|maennlich|david|markus|stefan|hans|yannick|daniel|thomas|george|james|guy|standard-b|standard-d|conrad|killian|jan/i;

export function normalizeVoiceGender(value: unknown): VoiceGender {
  return value === "male" ? "male" : "female";
}

export async function loadSpeechVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return existing;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1200);

    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

export function pickSpeechVoice(
  voices: SpeechSynthesisVoice[],
  locale: string,
  gender: VoiceGender
) {
  const langPrefix = locale.slice(0, 2).toLowerCase();
  const localeVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(langPrefix)
  );
  const pool = localeVoices.length > 0 ? localeVoices : voices;
  const hint = gender === "female" ? FEMALE_HINT : MALE_HINT;

  const named = pool.find((voice) => hint.test(voice.name));
  if (named) return named;

  const googleFemale = pool.find((v) => /google.*de.*a/i.test(v.name));
  const googleMale = pool.find((v) => /google.*de.*b/i.test(v.name));
  if (gender === "female" && googleFemale) return googleFemale;
  if (gender === "male" && googleMale) return googleMale;

  if (pool.length >= 2) {
    return gender === "female" ? pool[0] : pool[1];
  }

  return pool[0] ?? voices[0] ?? null;
}
