"use client";

import { useState } from "react";
import { BackgroundsPanel } from "./BackgroundsPanel";

/**
 * Header button (top-left, opposite the profile chip) opening the
 * backgrounds panel (D28).
 */
export function BackgroundsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn shrink-0"
        aria-label="Backgrounds"
        title="Community backgrounds"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </button>
      {open && <BackgroundsPanel onClose={() => setOpen(false)} />}
    </>
  );
}
