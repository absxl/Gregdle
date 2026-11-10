"use client";

import { useEffect, useState } from "react";

/**
 * Bottom-right announcement (D45 pattern): collapsed pill → expandable
 * terminal panel. Currently announces the move to gregdle.party.
 * Dismissal persists in localStorage; the key is static so every player
 * sees the announcement exactly once.
 */
export function ReleaseBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const key = "gregdle:v1:release-seen:domain-move";
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
      window.localStorage.setItem("gregdle:v1:release-seen:domain-move", "1");
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
          title="Announcement"
        >
          WE HAVE MOVED → GREGDLE.PARTY
        </button>
      ) : (
        <div className="panel corners w-72 border-accent/60 bg-surface/95 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <p className="label label-accent">New home · GREGDLE.PARTY</p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="flex h-6 w-6 items-center justify-center border border-edge text-xs font-black text-muted hover:border-accent hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-xs leading-relaxed text-muted">
            <li>▸ The site now lives at gregdle.party</li>
            <li>▸ Your progress and login carry over</li>
            <li>▸ Update your bookmarks</li>
          </ul>
        </div>
      )}
    </div>
  );
}
