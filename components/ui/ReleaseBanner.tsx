"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CURRENT_VERSION } from "@/lib/changelog";

/**
 * Bottom-right release announcement (D45): collapsed pill → expandable
 * terminal panel with the current release highlights. Dismissal persists
 * per version in localStorage; reduced-motion users get no pulse.
 */
export function ReleaseBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const key = `gregdle:v1:release-seen:${CURRENT_VERSION}`;
      if (!window.localStorage.getItem(key)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(true);
      }
    } catch {
      /* private mode: just show it */
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(`gregdle:v1:release-seen:${CURRENT_VERSION}`, "1");
    } catch {
      /* best-effort */
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40" role="status" aria-live="polite">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="panel corners flex items-center gap-2 border-accent/60 px-3 py-2 font-mono text-xs font-bold text-accent transition hover:border-accent hover:text-foreground"
          title="What's new"
        >
          <span className="animate-pulse text-accent">▸</span>v{CURRENT_VERSION} UNO IS OUT
        </button>
      ) : (
        <div className="panel corners w-72 border-accent/60 bg-surface/95 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <p className="label label-accent">New release · v{CURRENT_VERSION} Uno</p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss release announcement"
              className="flex h-6 w-6 items-center justify-center border border-edge text-xs font-black text-muted hover:border-accent hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-muted">
            <li>▸ The new GT Terminal theme</li>
            <li>▸ Community wallpapers with credits</li>
            <li>▸ Profiles, streaks and fire badges</li>
            <li>▸ Global stats: guests count too</li>
            <li>▸ Ko-fi support in the footer</li>
          </ul>
          <Link
            href="/changelog"
            className="mt-3 block border-t border-edge pt-2 font-mono text-xs font-bold text-accent hover:underline"
            onClick={dismiss}
          >
            READ FULL CHANGELOG →
          </Link>
        </div>
      )}
    </div>
  );
}
