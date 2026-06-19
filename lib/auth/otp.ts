export const RESEND_COOLDOWN_SECONDS = 60;

const RATE_LIMIT_PATTERNS = [
  /(\d+)\s*seconds?/i,
  /every\s+(\d+)\s*seconds?/i,
  /(\d+)\s*Sekunden/i
];

export function parseOtpRateLimitSeconds(message: string): number | null {
  for (const pattern of RATE_LIMIT_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const seconds = Number.parseInt(match[1], 10);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return seconds;
      }
    }
  }

  if (/rate.?limit|too many|once every|security purposes|zu oft|zu schnell/i.test(message)) {
    return RESEND_COOLDOWN_SECONDS;
  }

  return null;
}

export type OtpResendError =
  | { type: "rate_limit"; seconds: number }
  | { type: "error"; message: string };

export function formatOtpResendError(error: { message: string }): OtpResendError {
  const seconds = parseOtpRateLimitSeconds(error.message);
  if (seconds !== null) {
    return { type: "rate_limit", seconds };
  }

  return { type: "error", message: error.message };
}

export function formatResendCooldownLabel(seconds: number): string {
  return `Erneut senden in ${seconds}s`;
}
