"use client";

import { useEffect, useRef } from "react";

/**
 * Optional display-ad slot. Renders NOTHING until a provider is fully
 * configured via environment variables — the site stays ad-free by default.
 * When configured: static in-layout banners only, never popups/interstitials.
 */

const AD_UNITS: Record<string, string> = {
  "play-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_PLAY_BOTTOM ?? "",
  "result-modal": process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT ?? "",
  home: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME ?? "",
  stats: process.env.NEXT_PUBLIC_ADSENSE_SLOT_STATS ?? "",
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({
  slot,
  className = "",
  compact = false,
  label = "ADVERTISEMENT",
}: {
  slot: string;
  className?: string;
  compact?: boolean;
  label?: string;
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const unit = AD_UNITS[slot] ?? "";
  const pushed = useRef(false);

  useEffect(() => {
    if (client && unit && !pushed.current) {
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle ?? []).push({});
      } catch {
        /* script not loaded yet — retried on next render */
      }
    }
  }, [client, unit]);

  // Unconfigured => invisible: no placeholder boxes anywhere on the site.
  if (!client || !unit) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`ad-slot ${className} ${compact ? "min-h-[90px]" : "min-h-[110px]"}`}
    >
      <span className="ad-slot-label">{label}</span>
      <ins
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={unit}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
