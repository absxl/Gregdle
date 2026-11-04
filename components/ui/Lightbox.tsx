"use client";

import { useState, type ReactNode } from "react";

/**
 * Generic click-to-enlarge wrapper (D31): renders its children; clicking
 * opens the image fullscreen with a caption. Used for wallpaper galleries.
 */
export function Lightbox({
  src,
  caption,
  children,
  className = "",
}: {
  src: string;
  caption?: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
        onClick={() => setOpen(true)}
        aria-label={caption ? `Enlarge: ${caption}` : "Enlarge image"}
      >
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-black/85 p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption ?? ""}
            className="max-h-[75vh] max-w-full rounded-xl border border-edge object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {caption && <p className="text-sm font-bold">{caption}</p>}
          <p className="text-xs text-muted">tap anywhere to close</p>
        </div>
      )}
    </>
  );
}
