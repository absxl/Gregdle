"use client";

import { useEffect, useState } from "react";
import {
  fetchApprovedBackgrounds,
  getPinnedBackgroundId,
  type Background,
} from "@/lib/backgrounds";

/**
 * Site-wide background carousel (D28): dimmed, slightly blurred images
 * behind every page, crossfading every 30 s. Users' pinned favorite wins;
 * reduced-motion users get a single static image. Renders nothing when the
 * gallery is empty (plain dark theme).
 */

const SLIDE_MS = 30_000;

export function BackgroundLayer() {
  const [items, setItems] = useState<Background[]>([]);
  const [prev, setPrev] = useState<Background | null>(null);
  const [current, setCurrent] = useState<Background | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await fetchApprovedBackgrounds();
      if (cancelled || list.length === 0) return;
      const pinnedId = getPinnedBackgroundId();
      const pinned = pinnedId ? list.find((b) => b.id === pinnedId) : undefined;
      const chosen = pinned ?? list[0]!;
      setItems(list);
      setCurrent(chosen);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Carousel advance (skipped when pinned, hidden tab, or reduced motion).
  useEffect(() => {
    if (items.length < 2) return;
    if (getPinnedBackgroundId()) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const pos = items.findIndex((b) => b.id === current?.id);
      const nextBg = items[(pos + 1) % items.length]!;
      if (nextBg.id === current?.id) return;
      setPrev(current);
      setCurrent(nextBg);
      // Drop the previous image once the crossfade has had time to play.
      window.setTimeout(() => setPrev((p) => (p?.id === current?.id ? null : p)), 1600);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [items, current]);

  // Pin changes (from the panel) re-resolve the visible background.
  useEffect(() => {
    const onStorage = () => {
      const pinnedId = getPinnedBackgroundId();
      if (pinnedId && items.length > 0) {
        const pinned = items.find((b) => b.id === pinnedId);
        if (pinned && pinned.id !== current?.id) {
          setPrev(current);
          setCurrent(pinned);
          window.setTimeout(() => setPrev(null), 1600);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [items, current]);

  if (!current) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {prev && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={prev.url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "blur(2px) brightness(0.38) saturate(0.9)" }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt=""
        className="bg-fade absolute inset-0 h-full w-full object-cover"
        style={{ filter: "blur(2px) brightness(0.38) saturate(0.9)" }}
        key={current.id}
      />
      {/* Readability veil on top of the image. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/55" />
      {/* Cycling credit for the artist — links to their profile. */}
      <a
        href={current.sourceUrl ?? `/u/${encodeURIComponent(current.author)}`}
        target={current.sourceUrl ? "_blank" : undefined}
        rel={current.sourceUrl ? "noreferrer" : undefined}
        className="pointer-events-auto absolute bottom-1 left-2 z-0 text-[10px] font-semibold text-white/30 hover:text-white/70"
        title={current.title ? `${current.title} — by ${current.author}` : `by ${current.author}`}
      >
        bg: {current.author}
      </a>
    </div>
  );
}
