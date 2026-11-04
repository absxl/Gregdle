"use client";

import { useEffect, useState } from "react";
import {
  fetchApprovedBackgrounds,
  getPinnedBackgroundId,
  type Background,
} from "@/lib/backgrounds";

/**
 * Site-wide background carousel (D28/D35): dimmed, slightly blurred images
 * behind every page. Fully random — the starting pick on each visit and every
 * next pick are random (never the same image twice in a row). Users' pinned
 * favorite wins; reduced-motion users get a single static image. Renders
 * nothing when the gallery is empty (plain dark theme).
 */

const SLIDE_MS = 30_000;

/** Random item, avoiding a repeat of `avoidId` when there is a choice. */
function pickRandom(items: Background[], avoidId?: string | null): Background {
  if (items.length === 1) return items[0]!;
  let pick = items[Math.floor(Math.random() * items.length)]!;
  // Resample briefly rather than building exclusion lists (tiny N).
  for (let i = 0; i < 8 && pick.id === avoidId; i++) {
    pick = items[Math.floor(Math.random() * items.length)]!;
  }
  return pick;
}

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
      const chosen = pinned ?? pickRandom(list);
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
      const nextBg = pickRandom(items, current?.id);
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
        className="pointer-events-auto absolute bottom-2 left-3 z-0 rounded bg-black/55 px-2.5 py-1 font-mono text-sm font-semibold text-white/70 hover:text-white"
        title={current.title ? `${current.title} — by ${current.author}` : `by ${current.author}`}
      >
        bg: {current.author}
      </a>
    </div>
  );
}
