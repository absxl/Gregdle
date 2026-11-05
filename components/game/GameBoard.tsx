"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DatasetKey } from "@/lib/datasets";
import { datasetLabel } from "@/lib/datasets";
import type { GuessRow, GameDifficulty } from "@/lib/game/local-state";
import {
  indexDaily,
  loadDaily,
  msUntilUtcMidnight,
  saveDaily,
  shareText,
  utcDateToday,
} from "@/lib/game/local-state";
import { AdSlot } from "@/components/ads/AdSlot";
import { resolveGuess, suggestPartialNames } from "@/lib/game/match";
import { levelCount, type PuzzleKind } from "@/lib/game/puzzle";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { canonicalSiteUrl } from "@/lib/site";
import { renderSharePng } from "@/lib/game/share-image";
import { BackgroundsButton } from "@/components/backgrounds/BackgroundsButton";

/**
 * The game screen (PRD §6): autocomplete guess box with images, attribute
 * grid with a sticky guess column, hints (4/8 wrong guesses — hint 1 is the
 * machine's image, hint 2 the first letter), win animation, spoiler-free share, UTC-midnight countdown.
 * Comparisons always come from /api/guess; state persists to localStorage.
 */

type Mode = "daily" | "endless" | "puzzle";

interface PoolEntry {
  id: string;
  name: string;
  aliases: string[];
  image: string | null;
  /** Wiki page URL — public data, safe to expose (D46). */
  wiki?: string;
  /** Public attribute chips shown per suggestion (D20, Minedle-style). */
  info?: {
    tier: string;
    structure: string;
    size: string;
    func: string;
  };
}

interface Hint {
  text?: string;
  image?: string;
}

interface Props {
  datasetKey: DatasetKey;
  difficulty: GameDifficulty;
  mode: Mode;
  initialSeed: string | null;
  pool: PoolEntry[];
  columns: string[];
  /** Set when this is a puzzle run (D45). */
  puzzleKind?: PuzzleKind;
}

/** Wrong-guess counts that unlock hint 0 / hint 1 (D18). */
const HINT_THRESHOLDS = [4, 8];

const CELL_ICONS: Record<string, string> = {
  correct: "✓",
  partial: "◐",
  wrong: "✕",
  higher: "▲",
  lower: "▼",
};

const CELL_ARIA: Record<string, string> = {
  correct: "correct",
  partial: "partially correct",
  wrong: "wrong",
  higher: "answer is higher",
  lower: "answer is lower",
};

function httpsUrl(url: string): string {
  return url.startsWith("//") ? `https:${url}` : url;
}

export function GameBoard({
  datasetKey,
  difficulty,
  mode,
  initialSeed,
  pool,
  columns,
  puzzleKind,
}: Props) {
  const isPuzzle = puzzleKind !== undefined;
  const puzzleLevelMax = puzzleKind ? levelCount(puzzleKind) - 1 : 0;
  const today = utcDateToday();
  const [seed, setSeed] = useState<string | null>(initialSeed);
  const [rows, setRows] = useState<GuessRow[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "gave_up">("playing");
  const [answer, setAnswer] = useState<{
    id: string;
    name: string;
    image: string | null;
    sourceUrl?: string;
  } | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);
  const [puzzleLevel, setPuzzleLevel] = useState(0);
  const [puzzleGuesses, setPuzzleGuesses] = useState<{ name: string; correct: boolean }[]>([]);
  const [puzzleSrc, setPuzzleSrc] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const [sameGuessCount, setSameGuessCount] = useState<number | null>(null);
  const [totalGaveUps, setTotalGaveUps] = useState<number | null>(null);
  const resumedRef = useRef(false);

  // ------------------------------------------------------------- persistence
  useEffect(() => {
    if (mode !== "daily" || resumedRef.current) return;
    resumedRef.current = true;
    const saved = loadDaily(datasetKey, difficulty, today);
    if (saved) {
      // Hydration from localStorage: only valid after mount (no window on SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(saved.rows);

      setStatus(saved.status);

      setHints((saved.hints ?? []).map((h) => (typeof h === "string" ? { text: h } : h)));
      if (saved.answer) setAnswer(saved.answer);
      if (saved.status !== "playing") setShowResult(true);
    }
  }, [datasetKey, difficulty, mode, today]);

  const persist = useCallback(
    (
      nextRows: GuessRow[],
      nextStatus: "playing" | "won" | "gave_up",
      nextHints: Hint[],
      nextAnswer?: typeof answer,
    ) => {
      if (mode !== "daily") return;
      const game = {
        datasetKey,
        difficulty,
        date: today,
        rows: nextRows,
        hintsUsed: nextHints.filter(Boolean).length,
        hints: nextHints,
        status: nextStatus,
        ...(nextAnswer ? { answer: nextAnswer } : {}),
      };
      saveDaily(game);
      indexDaily(game);
    },
    [datasetKey, difficulty, mode, today],
  );

  // Endless seed (client-only randomness — would cause hydration mismatch if lazy)
  useEffect(() => {
    if (mode === "endless" && !seed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeed(Math.random().toString(36).slice(2) + Date.now().toString(36));
    }
  }, [mode, seed]);

  // Puzzle mode: fetch the current level's crop (D45). Advances on wrong guesses.
  useEffect(() => {
    if (!isPuzzle || mode !== "puzzle" || puzzleKind) {
      if (!isPuzzle) {
        setPuzzleSrc(null);
        setPuzzleLevel(0);
      }
      return;
    }
    const controller = new AbortController();
    const qs = new URLSearchParams({ date: today, kind: puzzleKind!, level: String(puzzleLevel) });
    void fetch(`/api/puzzle/image?${qs}`, { signal: controller.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => b && setPuzzleSrc(URL.createObjectURL(b)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [isPuzzle, puzzleKind, puzzleLevel, mode, today]);

  // Guest detection: enables the "sign in to save progress" nudge (D37).
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setGuest(true);
    });
  }, []);

  // All-time give-up counter (D41) — shown next to the Give up button.
  useEffect(() => {
    void fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { totalGaveUps?: number } | null) => {
        if (d && typeof d.totalGaveUps === "number") setTotalGaveUps(d.totalGaveUps);
      })
      .catch(() => undefined);
  }, []);

  const loginToSave = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    // After returning, AuthPanel's migration pushes this finished game server-side.
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: canonicalSiteUrl() },
    });
  }, []);

  // Countdown to UTC midnight
  useEffect(() => {
    const tick = () => {
      const ms = msUntilUtcMidnight();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ------------------------------------------------- leaderboard submission
  // Signed-in players' daily results go to the server-validated RPC (the DB
  // re-checks the claimed win against the hidden answer — PRD §7.3).
  const submitResult = useCallback(
    async (finalRows: GuessRow[], won: boolean, hintsUsedCount: number) => {
      if (mode !== "daily") return;
      const supabase = getSupabaseBrowser();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return; // guest — local stats only
      await supabase.rpc("submit_daily_result", {
        p_dataset: datasetKey,
        p_difficulty: difficulty,
        p_date: today,
        p_guesses: finalRows.map((r) => r.guessId),
        p_won: won,
        p_hints_used: hintsUsedCount,
      });
    },
    [datasetKey, difficulty, mode, today],
  );

  // ---------------------------------------------------- global stat event
  // One anonymized event per finished daily — guests included (D40).
  const postGlobalStat = useCallback(
    async (finalRows: GuessRow[], won: boolean, hintsUsedCount: number) => {
      if (mode !== "daily") return;
      try {
        await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: today,
            datasetKey,
            difficulty,
            won,
            gaveUp: !won,
            hintsUsed: hintsUsedCount,
            guessCount: finalRows.length,
          }),
        });
      } catch {
        /* stats are best-effort */
      }
    },
    [datasetKey, difficulty, mode, today],
  );

  // ------------------------------------------------------------------ guess
  const submitGuess = useCallback(
    async (guessId: string) => {
      if (loading || status !== "playing" || !guessId) return;
      setError(null);
      if (rows.some((r) => r.guessId === guessId)) {
        setError("Already guessed — pick another machine.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datasetKey,
            difficulty,
            mode,
            ...(mode === "daily" ? { date: today } : { seed: seed! }),
            guessId,
          }),
        });
        if (!res.ok) {
          setError(res.status === 429 ? "Slow down a moment." : "Guess failed — try again.");
          return;
        }
        const data = (await res.json()) as {
          result?: GuessRow;
          answer?: typeof answer;
          sameGuessCount?: number | null;
        };
        if (!data.result) {
          setError("Guess failed — try again.");
          return;
        }
        const nextRows = [...rows, data.result];
        setRows(nextRows);
        if (mode === "daily" && typeof data.sameGuessCount === "number") {
          setSameGuessCount(data.sameGuessCount);
        }
        if (data.result.won && data.answer) {
          setAnswer(data.answer);
          setStatus("won");
          setShowResult(true);
          persist(nextRows, "won", hints, data.answer);
          submitResult(nextRows, true, hints.filter(Boolean).length);
          postGlobalStat(nextRows, true, hints.filter(Boolean).length);
        } else if (mode === "daily") {
          persist(nextRows, "playing", hints);
        }
      } catch {
        setError("Network error — try again.");
      } finally {
        setLoading(false);
      }
    },
    [
      datasetKey,
      difficulty,
      hints,
      loading,
      mode,
      persist,
      rows,
      seed,
      status,
      submitResult,
      today,
    ],
  );

  const giveUp = useCallback(async () => {
    if (status !== "playing") return;
    setLoading(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetKey,
          difficulty,
          mode,
          ...(mode === "daily" ? { date: today } : { seed: seed! }),
          guessId: "x", // ignored when giveUp is set
          giveUp: true,
        }),
      });
      const data = (await res.json()) as { answer?: typeof answer };
      if (data.answer) {
        setAnswer(data.answer);
        setStatus("gave_up");
        setShowResult(true);
        persist(rows, "gave_up", hints, data.answer);
        submitResult(rows, false, hints.filter(Boolean).length);
        postGlobalStat(rows, false, hints.filter(Boolean).length);
      }
    } finally {
      setLoading(false);
    }
  }, [
    datasetKey,
    difficulty,
    hints,
    mode,
    persist,
    postGlobalStat,
    rows,
    seed,
    status,
    submitResult,
    today,
  ]);

  // ------------------------------------------------------------------ hints
  const wrongCount = rows.length;
  const availableHints = HINT_THRESHOLDS.filter((t) => wrongCount >= t).length;
  const revealHint = useCallback(
    async (index: 0 | 1) => {
      if (index >= availableHints || hints[index] !== undefined) return;
      try {
        const res = await fetch("/api/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            datasetKey,
            difficulty,
            mode,
            ...(mode === "daily" ? { date: today } : { seed: seed! }),
            index,
          }),
        });
        const data = (await res.json()) as Hint;
        if (data.text || data.image) {
          const next = [...hints];
          next[index] = data;
          setHints(next);
          persist(rows, status, next);
        }
      } catch {
        /* hint is a nicety — ignore failures */
      }
    },
    [availableHints, datasetKey, difficulty, hints, mode, persist, rows, seed, status, today],
  );

  // ------------------------------------------------------------------ share
  const onShare = useCallback(() => {
    const text = shareText({
      datasetKey,
      difficulty,
      date: today,
      rows,
      hintsUsed: hints.filter(Boolean).length,
      hints,
      status,
      ...(answer ? { answer } : {}),
    } as Parameters<typeof shareText>[0]);
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setError("Copy failed — select the text manually."),
    );
  }, [answer, datasetKey, difficulty, hints, rows, status, today]);

  const onShareImage = useCallback(async () => {
    try {
      const blob = await renderSharePng({
        title: `${datasetLabel(datasetKey)} [${difficulty.toUpperCase()}] — ${mode === "daily" ? "DAILY" : "ENDLESS"}`,
        date: today,
        columns,
        rows,
        summary:
          status === "won"
            ? `${rows.length} guess${rows.length === 1 ? "" : "es"}` +
              (hints.filter(Boolean).length > 0
                ? ` · ${hints.filter(Boolean).length} hint${hints.filter(Boolean).length === 1 ? "" : "s"}`
                : "")
            : "gave up",
      });
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch {
      setError("Image copy not supported here — try the text share.");
    }
  }, [columns, datasetKey, difficulty, hints, mode, rows, status, today]);

  const playAgain = useCallback(() => {
    if (mode !== "endless") return;
    setSeed(Math.random().toString(36).slice(2) + Date.now().toString(36));
    setRows([]);
    setStatus("playing");
    setAnswer(null);
    setHints([]);
    setShowResult(false);
    setError(null);
  }, [mode]);

  const guessedIds = useMemo(() => new Set(rows.map((r) => r.guessId)), [rows]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 p-3 pb-12 sm:p-5">
      {/* Header */}
      <header className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackgroundsButton />
          <Link
            href="/"
            className="font-pixel text-3xl leading-none tracking-wide hover:text-accent"
          >
            GREGDLE
          </Link>
          <span className="text-sm font-bold text-muted">
            {datasetLabel(datasetKey).replace(" // ", " · ")} ·{" "}
            {difficulty === "easy" ? "Easy" : "Hard"} · {mode === "daily" ? "Daily" : "Endless"}
          </span>
        </div>
        {mode === "daily" && (
          <span className="chip" aria-label="Time until next daily">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="text-muted"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="font-pixel text-lg tabular-nums text-foreground">{countdown}</span>
          </span>
        )}
      </header>

      {/* Guess input */}
      {status === "playing" &&
        (difficulty === "hard" ? (
          <HardGuessInput pool={pool} disabled={loading} onPick={submitGuess} />
        ) : (
          <Autocomplete pool={pool} exclude={guessedIds} disabled={loading} onPick={submitGuess} />
        ))}

      {error && (
        <p
          role="alert"
          className="w-full rounded-lg border border-bad bg-bad/15 px-3 py-2 text-sm font-bold text-foreground"
        >
          {error}
        </p>
      )}

      {/* Legend — always visible (classic modes) */}
      <div className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted ${isPuzzle ? "hidden" : ""}`}>
        <LegendItem cls="cell-correct" icon="✓" label="correct" />
        <LegendItem cls="cell-partial" icon="◐" label="partial" />
        <LegendItem cls="cell-wrong" icon="✕" label="wrong" />
        <LegendItem cls="cell-higher" icon="▲" label="answer higher" />
        <LegendItem cls="cell-lower" icon="▼" label="answer lower" />
      </div>

      {/* Hints — Hard mode plays without any hints (D36) */}
      {difficulty === "easy" && (
        <div className="flex w-full flex-wrap items-center gap-2">
          {HINT_THRESHOLDS.map((threshold, i) => {
            const unlocked = availableHints > i;
            const revealed = hints[i] !== undefined;
            return revealed ? (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-edge bg-surface2 px-3 py-2"
              >
                {hints[i].image ? (
                  <button
                    type="button"
                    onClick={() => setLightbox({ src: hints[i].image!, name: "Mystery machine" })}
                    className="cursor-zoom-in rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Expand hint image"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hints[i].image}
                      alt="Hint: the machine's appearance"
                      className="h-24 w-24 rounded-lg border border-edge bg-black/30 object-contain p-1"
                    />
                  </button>
                ) : (
                  <span className="text-sm font-bold">{hints[i].text}</span>
                )}
              </div>
            ) : (
              <button
                key={i}
                type="button"
                disabled={!unlocked || status !== "playing"}
                onClick={() => revealHint(i as 0 | 1)}
                className="btn"
              >
                {unlocked
                  ? `Reveal hint ${i + 1}`
                  : `Hint ${i + 1} unlocks at ${threshold} guesses`}
              </button>
            );
          })}
        </div>
      )}

      {mode === "daily" && sameGuessCount !== null && (
        <p className="font-mono text-xs text-muted">
          {sameGuessCount} player{sameGuessCount === 1 ? "" : "s"} made this same guess today.
        </p>
      )}

      {/* Guess grid — sticky guess column, horizontally scrollable attributes */}
      <div className="panel w-full overflow-hidden p-2">
        <div className="grid-outer w-full">
          <div
            className="grid-grid"
            style={{ gridTemplateColumns: `11rem repeat(${columns.length}, minmax(6.4rem, 1fr))` }}
            role="table"
            aria-label="Guess grid"
          >
            <div className="grid-head grid-head-name">GUESS</div>
            {columns.map((c) => (
              <div key={c} className="grid-head">
                {c}
              </div>
            ))}
            {rows.map((row, r) => (
              <GuessGridRow
                key={row.guessId}
                row={row}
                index={r}
                highlight={row.won}
                onImageClick={(src, name) => setLightbox({ src, name })}
              />
            ))}
            {rows.length === 0 && (
              <div className="col-span-full px-3 py-8 text-center text-sm font-semibold text-muted">
                Type a machine name above — every guess reveals how its attributes compare to the
                answer.
              </div>
            )}
          </div>
        </div>
        {rows.length > 0 && (
          <p className="mt-1 px-2 text-right text-[11px] text-muted sm:hidden">
            ← swipe for more →
          </p>
        )}
      </div>

      {/* Post-game actions (visible after closing the results modal) */}
      {status !== "playing" && !showResult && (
        <div className="flex w-full flex-wrap items-center gap-2">
          {mode === "daily" ? (
            <>
              <button type="button" onClick={onShareImage} className="btn btn-primary">
                {copiedImage ? "Image copied!" : "Share image"}
              </button>
              <button type="button" onClick={onShare} className="btn">
                {copied ? "Copied!" : "Share text"}
              </button>
            </>
          ) : (
            <button type="button" onClick={playAgain} className="btn btn-primary">
              Play again
            </button>
          )}
          <button type="button" onClick={() => setShowResult(true)} className="btn text-muted">
            Show result
          </button>
          {guest && (
            <button type="button" onClick={loginToSave} className="btn text-muted">
              Sign in to save progress
            </button>
          )}
        </div>
      )}

      {/* Give up — puzzle: after 3 wrong guesses */}
      {isPuzzle && status === "playing" && puzzleGuesses.length >= 3 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading}
            className="btn text-muted"
            onClick={() => {
              void (async () => {
                const res = await fetch("/api/guess", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    datasetKey,
                    difficulty,
                    mode,
                    date: today,
                    kind: puzzleKind,
                    guessId: "x",
                    giveUp: true,
                  }),
                });
                const data = (await res.json()) as { answer?: typeof answer };
                if (data.answer) {
                  setAnswer(data.answer);
                  setStatus("gave_up");
                  setShowResult(true);
                }
              })();
            }}
          >
            Give up
          </button>
          {totalGaveUps !== null && totalGaveUps > 0 && (
            <span className="font-mono text-xs text-muted">
              {totalGaveUps} player{totalGaveUps === 1 ? " has" : "s have"} given up so far.
            </span>
          )}
        </div>
      )}
      {!isPuzzle && status === "playing" && rows.length >= 3 && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={giveUp} disabled={loading} className="btn text-muted">
            Give up
          </button>
          {totalGaveUps !== null && totalGaveUps > 0 && (
            <span className="font-mono text-xs text-muted">
              {totalGaveUps} player{totalGaveUps === 1 ? " has" : "s have"} given up so far.
            </span>
          )}
        </div>
      )}

      <AdSlot slot="play-bottom" className="w-full" label="ADVERTISEMENT" />

      {/* Results modal */}
      {showResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Game result"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-edge bg-surface shadow-2xl">
            <button
              type="button"
              onClick={() => setShowResult(false)}
              aria-label="Close and review guesses"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-edge bg-surface2/90 text-lg font-black text-muted hover:border-accent hover:text-foreground"
            >
              ✕
            </button>
            {status === "won" && <Confetti />}
            <div className="flex flex-col items-center gap-4 p-6 pt-8 text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl font-black ${
                  status === "won" ? "win-badge bg-good text-good-ink" : "bg-surface2 text-muted"
                }`}
                aria-hidden="true"
              >
                {status === "won" ? "✓" : "?"}
              </div>
              <p className="label label-accent">
                {status === "won" ? "RESULT // SOLVED" : "RESULT // FAILED"}
              </p>
              <h2 className="font-pixel text-4xl leading-none tracking-wide">
                {status === "won" ? "CORRECT!" : "GAME OVER"}
              </h2>
              {answer && (
                <div className="flex flex-col items-center gap-2">
                  {answer.image && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox({ src: httpsUrl(answer.image!), name: answer.name })
                      }
                      className="cursor-zoom-in rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                      aria-label={`Expand image of ${answer.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={httpsUrl(answer.image)}
                        alt={answer.name}
                        className="h-32 w-32 rounded-xl border border-edge bg-black/30 object-contain p-1.5"
                      />
                    </button>
                  )}
                  {answer.sourceUrl ? (
                    <a
                      href={answer.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-lg font-bold underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
                      title={`Open the ${answer.name} wiki page`}
                    >
                      {answer.name}
                    </a>
                  ) : (
                    <p className="text-lg font-bold">{answer.name}</p>
                  )}
                </div>
              )}
              <p className="text-sm font-semibold text-muted">
                {status === "won"
                  ? `${rows.length} guess${rows.length === 1 ? "" : "es"}` +
                    (hints.filter(Boolean).length > 0
                      ? ` · ${hints.filter(Boolean).length} hint${hints.filter(Boolean).length === 1 ? "" : "s"} used`
                      : "")
                  : "Better luck tomorrow — or practice in endless mode."}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {mode === "daily" ? (
                  <>
                    <button type="button" onClick={onShareImage} className="btn btn-primary">
                      {copiedImage ? "Image copied!" : "Share image"}
                    </button>
                    <button type="button" onClick={onShare} className="btn">
                      {copied ? "Copied!" : "Share text"}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={playAgain} className="btn btn-primary">
                    Play again
                  </button>
                )}
                <Link href="/" className="btn">
                  Home
                </Link>
              </div>
              {guest && mode === "daily" && (
                <button type="button" onClick={loginToSave} className="btn text-muted">
                  Sign in to save progress
                </button>
              )}
              <AdSlot slot="result-modal" className="w-full" compact label="AD" />
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox — tap any machine image to enlarge */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/85 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${lightbox.name} image`}
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.name}
            className="max-h-[70vh] max-w-full rounded-xl border border-edge bg-black/40 object-contain p-2"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="font-pixel text-2xl tracking-wide">{lightbox.name}</p>
          <p className="text-xs text-muted">tap anywhere to close</p>
        </div>
      )}
    </main>
  );
}

// -------------------------------------------------------------------- rows --

function GuessGridRow({
  row,
  index,
  highlight,
  onImageClick,
}: {
  row: GuessRow;
  index: number;
  highlight?: boolean;
  onImageClick?: (src: string, name: string) => void;
}) {
  return (
    <>
      <div className={`grid-name ${highlight ? "win-row" : ""}`}>
        {row.guessImage &&
          (onImageClick ? (
            <button
              type="button"
              onClick={() => onImageClick(httpsUrl(row.guessImage!), row.guessName)}
              className="shrink-0 cursor-zoom-in rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label={`Expand image of ${row.guessName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={httpsUrl(row.guessImage)}
                alt={row.guessName}
                className="h-14 w-14 rounded-lg border border-edge bg-black/30 object-contain p-0.5"
                loading="lazy"
              />
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={httpsUrl(row.guessImage)}
              alt={row.guessName}
              className="h-14 w-14 shrink-0 rounded-lg border border-edge bg-black/30 object-contain p-0.5"
              loading="lazy"
            />
          ))}
        <WikiNameLink name={row.guessName} />
      </div>
      {row.cells.map((cell, i) => (
        <div
          key={i}
          className={`cell cell-${cell.state} ${highlight ? "win-cell" : ""}`}
          style={{ animationDelay: `${index * 50 + i * 90}ms` }}
          title={`${cell.detail ?? cell.value} — ${CELL_ARIA[cell.state]}`}
        >
          <span className="cell-icon" aria-hidden="true">
            {CELL_ICONS[cell.state]}
          </span>
          <span className="cell-value">{cell.value}</span>
          <span className="sr-only">{CELL_ARIA[cell.state]}</span>
        </div>
      ))}
    </>
  );
}

function LegendItem({ cls, icon, label }: { cls: string; icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`cell ${cls} legend-cell`} aria-hidden="true">
        <span className="cell-icon">{icon}</span>
      </span>
      {label}
    </span>
  );
}

// ------------------------------------------------------------ autocomplete --

function Autocomplete({
  pool,
  exclude,
  disabled,
  onPick,
}: {
  pool: PoolEntry[];
  exclude: Set<string>;
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter((e) => !exclude.has(e.id))
      .map((e) => {
        const name = e.name.toLowerCase();
        let score = Infinity;
        if (name.startsWith(q)) score = 0;
        else if (name.includes(q)) score = 1;
        else if (e.aliases.some((a) => a.toLowerCase().includes(q))) score = 2;
        else if (
          q.length >= 4 &&
          name.replace(/[^a-z0-9]/g, "").includes(q.replace(/[^a-z0-9]/g, ""))
        )
          score = 3;
        return { entry: e, score };
      })
      .filter((m) => m.score < Infinity)
      .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name))
      .slice(0, 10)
      .map((m) => m.entry);
  }, [exclude, pool, query]);

  const pick = (entry: PoolEntry) => {
    setQuery("");
    setActive(0);
    setOpen(false);
    onPick(entry.id);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder="Search a machine to guess…"
        aria-label="Search a machine to guess"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-edge bg-surface2 px-4 py-3.5 text-lg font-semibold text-foreground placeholder:font-normal placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      {open && matches.length > 0 && (
        <ul
          role="listbox"
          aria-label="Matching machines"
          className="absolute z-40 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-edge bg-surface shadow-xl"
        >
          {matches.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                disabled={disabled}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(m)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                  i === active ? "bg-accent/15" : "hover:bg-accent/10"
                }`}
              >
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-edge bg-black/30 object-contain p-0.5"
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="h-12 w-12 shrink-0 rounded-lg border border-edge bg-black/30"
                    aria-hidden="true"
                  />
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-base font-bold">{m.name}</span>
                  {m.info && (
                    <span className="flex flex-wrap gap-1 text-[10px] font-bold text-muted">
                      <span className="rounded border border-edge bg-surface px-1 py-px">
                        {m.info.tier}
                      </span>
                      <span className="rounded border border-edge bg-surface px-1 py-px">
                        {m.info.structure}
                      </span>
                      <span className="rounded border border-edge bg-surface px-1 py-px">
                        {m.info.size}
                      </span>
                      <span className="rounded border border-edge bg-surface px-1 py-px">
                        {m.info.func}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- confetti --

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 10) * 90,
        duration: 1400 + ((i * 53) % 700),
        color: ["var(--good)", "var(--accent)", "var(--direction)", "var(--partial)"][i % 4],
        size: 6 + (i % 3) * 3,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.5,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------- hard mode input --

/**
 * Hard mode (D36): no dropdown, no machine list, no tags — plain typing.
 * What is typed is auto-corrected to the closest machine name (small typos
 * forgiven; wildly different strings are rejected).
 */
function HardGuessInput({
  pool,
  disabled,
  onPick,
}: {
  pool: PoolEntry[];
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Name-only suggestions (D38): no attributes, no chips.
  const suggestions = useMemo(() => suggestPartialNames(query, pool, 5), [pool, query]);
  const showSuggestions = open && suggestions.length > 0;

  const submit = () => {
    setError(null);
    const q = query.trim();
    if (!q) return;
    const match = resolveGuess(q, pool);
    if (!match) {
      // Deliberately vague: no hint about how close the guess was.
      setQuery("");
      setOpen(false);
      setError("No close machine match — check the spelling and try again.");
      return;
    }
    setQuery("");
    setOpen(false);
    onPick(match.id);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder="Type the name of a machine — no suggestions on Hard."
        aria-label="Type a machine name to guess"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-edge bg-surface2 px-4 py-3 text-base font-semibold text-foreground placeholder:font-normal placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      {showSuggestions && (
        <ul
          role="listbox"
          aria-label="Name suggestions"
          className="absolute z-40 mt-1 w-full overflow-auto rounded-lg border border-edge bg-surface shadow-xl"
        >
          {suggestions.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button
                type="button"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                  onPick(m.id);
                }}
                className="block w-full px-3 py-2 text-left text-sm font-bold hover:bg-accent/10"
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Machine name linking to its GTNH wiki page (D46). Safe mid-game: a guess
 * is already public knowledge — it never reveals the hidden answer.
 */
function WikiNameLink({ name }: { name: string }) {
  const url = `https://wiki.gtnewhorizons.com/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="truncate text-base font-bold hover:text-accent"
      title={`${name} — open the GTNH wiki page`}
    >
      {name}
    </a>
  );
}
