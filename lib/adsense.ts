export type AdSensePlacement = "landing" | "sidebar" | "feed";

const ADSENSE_CLIENT_ID = "ca-pub-9259103716434934";

export function getAdSenseClientId() {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || ADSENSE_CLIENT_ID;
}

export function isAdSenseEnabled() {
  return getAdSenseClientId().length > 0;
}

export function getAdSenseSlot(placement: AdSensePlacement) {
  const envKey =
    placement === "landing"
      ? "NEXT_PUBLIC_ADSENSE_SLOT_LANDING"
      : placement === "sidebar"
        ? "NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR"
        : "NEXT_PUBLIC_ADSENSE_SLOT_FEED";
  return process.env[envKey]?.trim() || "";
}
