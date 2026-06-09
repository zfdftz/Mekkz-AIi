"use client";

import { useEffect, useRef, useState } from "react";
import { buildPollinationsImageProxyPath } from "@/lib/pollinations-url";
import { resolveChatImageSrc } from "@/lib/image-display";

type ChatImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageGenPrompt?: string;
};

export function ChatImage({ src, alt, className, imageGenPrompt }: ChatImageProps) {
  const resolved = resolveChatImageSrc(src);
  const isEmbedded = resolved.startsWith("data:") || src.startsWith("db:");
  const proxySrc =
    imageGenPrompt && !isEmbedded
      ? buildPollinationsImageProxyPath(imageGenPrompt)
      : resolved;

  const [displaySrc, setDisplaySrc] = useState(isEmbedded ? resolved : proxySrc);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    isEmbedded ? "ready" : "loading"
  );
  const loadedRef = useRef(isEmbedded ? resolved : "");

  useEffect(() => {
    if (isEmbedded) {
      loadedRef.current = resolved;
      setDisplaySrc(resolved);
      setStatus("ready");
      return;
    }

    if (loadedRef.current && loadedRef.current.startsWith("data:")) {
      return;
    }

    setDisplaySrc(proxySrc);
    if (loadedRef.current !== proxySrc) {
      setStatus("loading");
    }
  }, [isEmbedded, resolved, proxySrc]);

  function retry() {
    loadedRef.current = "";
    setDisplaySrc(`${proxySrc}&retry=${Date.now() % 2_147_483_647}`);
    setStatus("loading");
  }

  return (
    <div className="space-y-2">
      {status === "loading" ? (
        <p className="text-xs text-muted">Bild wird erstellt… (bitte 15–45 Sek. warten)</p>
      ) : null}
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={alt}
          className={className}
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={() => {
            loadedRef.current = displaySrc;
            setStatus("ready");
          }}
          onError={() => setStatus("error")}
        />
      ) : null}
      {status === "error" ? (
        <div className="space-y-1">
          <p className="text-xs text-red-300">
            Bild konnte nicht geladen werden. Kurz warten und erneut versuchen.
          </p>
          <button type="button" onClick={retry} className="text-xs text-violet-300 underline">
            Bild erneut laden
          </button>
        </div>
      ) : null}
    </div>
  );
}
