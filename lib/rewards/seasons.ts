import { SEASON_1_DURATION_DAYS, SEASON_EPOCH, SEASON_ROTATION_DAYS } from "./constants";
import { SEASONS, type SeasonDef } from "./catalog";

export type SeasonInfo = {
  current: SeasonDef;
  index: number;
  dayInSeason: number;
  daysUntilNext: number;
  nextSeason: SeasonDef;
  legacySeasonIndices: number[];
};

export function seasonDurationDays(index: number) {
  return index === 0 ? SEASON_1_DURATION_DAYS : SEASON_ROTATION_DAYS;
}

export function seasonCycleLengthDays() {
  return SEASONS.reduce((sum, s) => sum + seasonDurationDays(s.index), 0);
}

export function getCurrentSeasonInfo(now = new Date()): SeasonInfo {
  const msPerDay = 86400000;
  const cycleLen = seasonCycleLengthDays();
  const daysSinceEpoch = Math.max(
    0,
    Math.floor((now.getTime() - SEASON_EPOCH.getTime()) / msPerDay)
  );
  const dayInCycle = daysSinceEpoch % cycleLen;

  let accumulated = 0;
  for (let i = 0; i < SEASONS.length; i++) {
    const dur = seasonDurationDays(i);
    if (dayInCycle < accumulated + dur) {
      const dayInSeason = dayInCycle - accumulated;
      const daysUntilNext = Math.max(1, dur - dayInSeason);
      const nextIndex = (i + 1) % SEASONS.length;

      const legacySeasonIndices: number[] = [];
      for (let j = 0; j < i; j++) legacySeasonIndices.push(j);
      const fullCycles = Math.floor(daysSinceEpoch / cycleLen);
      for (let c = 0; c < fullCycles; c++) {
        for (let j = 0; j < SEASONS.length; j++) {
          if (j !== i) legacySeasonIndices.push(j);
        }
      }

      return {
        current: SEASONS[i],
        index: i,
        dayInSeason,
        daysUntilNext,
        nextSeason: SEASONS[nextIndex],
        legacySeasonIndices: [...new Set(legacySeasonIndices.filter((s) => s !== i))]
      };
    }
    accumulated += dur;
  }

  return {
    current: SEASONS[0],
    index: 0,
    dayInSeason: 0,
    daysUntilNext: SEASON_1_DURATION_DAYS,
    nextSeason: SEASONS[1],
    legacySeasonIndices: []
  };
}

export function formatSeasonCountdown(daysUntilNext: number, nextSeasonName: string) {
  if (daysUntilNext <= 1) return "Next season morgen";
  return `Next season in ${daysUntilNext} Tagen · ${nextSeasonName}`;
}
