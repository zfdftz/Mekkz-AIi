export type MicrophoneCheckResult =
  | { ok: true }
  | { ok: false; code: "unsupported" | "no_device" | "denied" | "blocked" | "unknown"; message: string };

export async function checkMicrophoneAvailability(): Promise<MicrophoneCheckResult> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      code: "unsupported",
      message: "Dein Browser unterstützt kein Mikrofon."
    };
  }

  try {
    if (navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((device) => device.kind === "audioinput");
      if (inputs.length === 0) {
        return {
          ok: false,
          code: "no_device",
          message:
            "Kein Mikrofon gefunden. Bitte Headset/USB-Mikro anschließen oder Mikro in Windows aktivieren."
        };
      }
    }
  } catch {
    // enumerateDevices can fail before permission — continue with getUserMedia probe.
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        ok: false,
        code: "no_device",
        message:
          "Kein Mikrofon gefunden. Laptop ohne Mikro? Headset anschließen oder Mikro in den Systemeinstellungen aktivieren."
      };
    }
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        ok: false,
        code: "denied",
        message: "Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben."
      };
    }
    if (name === "NotReadableError") {
      return {
        ok: false,
        code: "blocked",
        message: "Mikrofon wird von einer anderen App blockiert oder ist deaktiviert."
      };
    }
    return {
      ok: false,
      code: "unknown",
      message: "Mikrofon konnte nicht gestartet werden."
    };
  }
}
