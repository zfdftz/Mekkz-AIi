import { getCurrentSeasonInfo } from "./seasons";

export function getSeasonUiClass(now = new Date()) {
  const { index } = getCurrentSeasonInfo(now);
  return `season-ui-${index}`;
}

export function getSeasonButtonClass(now = new Date()) {
  return `${getSeasonUiClass(now)} season-btn`;
}
