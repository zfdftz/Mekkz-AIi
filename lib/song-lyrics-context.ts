function looksLikeDirectQuestionOrCommand(text: string) {
  return /^(was|wie|warum|wer|wann|wo|welche|kannst|erkläre|mach|schreib|hilf|what|how|why|who|when|where|can you|tell me|explain|write|help)\b/i.test(
    text.trim()
  );
}

/** User pasted lyrics or a lyric fragment — not a normal question. */
export function looksLikeSongLyrics(text: string) {
  const clean = text.trim();
  if (clean.length < 12 || clean.length > 1200) return false;
  if (/https?:\/\//.test(clean)) return false;
  if (looksLikeDirectQuestionOrCommand(clean)) return false;

  const lines = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  if (lines.length >= 2) {
    const lengths = lines.map((line) => line.length);
    const avg = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    if (avg >= 6 && avg <= 110 && lines.length <= 24) return true;
  }

  const single = lines[0] ?? clean;
  if (single.length < 15) return false;

  if (/\b(la la|na na|oh oh|yeah yeah|du du|ra ra|boom boom|mmm+|ahh+|ooh+|woah)\b/i.test(single)) {
    return true;
  }

  if (
    /[,—–-]/.test(single) &&
    !single.endsWith("?") &&
    single.split(/[.!?]/).filter(Boolean).length <= 2
  ) {
    return true;
  }

  if (
    /\b(baby|love|heart|night|light|dream|forever|never|soul|pain|rain|fire|home|alone|goodbye|hello)\b/i.test(
      single
    ) &&
    single.length <= 220 &&
    !single.includes("?")
  ) {
    return true;
  }

  return false;
}

export function buildSongLyricsResponsePrompt() {
  return (
    "SONG LYRICS (user sent lyrics or a lyric line):\n" +
    "- First continue the lyrics naturally for 1–3 short lines in the same language and vibe.\n" +
    "- Then switch to normal speech and identify the song if you know it, e.g. " +
    "\"Meinst du das Lied **[Titel]** von **[Künstler]**?\" (always in the user's language).\n" +
    "- Add 1–2 sentences about the song (Stimmung, Thema, wofür es bekannt ist).\n" +
    "- If unsure: say honestly you're not sure, optionally one careful guess — still continue the lyrics briefly first.\n" +
    "- Keep the whole reply compact. Short lyric continuation + song chat, not an essay.\n"
  );
}
