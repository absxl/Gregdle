"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchApprovedBackgrounds,
  getPinnedBackgroundId,
  pinBackground,
  type Background,
} from "@/lib/backgrounds";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { compressBackground } from "@/lib/image-compress";

/**
 * Backgrounds panel (D28): gallery (pin/shuffle), submission form
 * (Discord-authenticated; jpg/png/webp <= 2MB, >= 1600px wide), and the
 * owner-only moderation tab. Opened from the header button.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const MIN_WIDTH = 1600;

interface SubmissionRow {
  id: string;
  storage_path: string;
  author_name: string;
  status: string;
  created_at: string;
}

export function BackgroundsPanel({ onClose }: { onClose: () => void }) {
  const supabase = getSupabaseBrowser();
  const [tab, setTab] = useState<"gallery" | "submit" | "approve">("gallery");
  const [items, setItems] = useState<Background[]>([]);
  const [pinned, setPinned] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState<SubmissionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bgTitle, setBgTitle] = useState("");
  const [bgDesc, setBgDesc] = useState("");

  const reload = useCallback(async (force = false) => {
    const list = await fetchApprovedBackgrounds(force);
    setItems(list);
    setPinned(getPinnedBackgroundId());
  }, []);

  const loadPending = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("background_submissions")
      .select("id,storage_path,author_name,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (data) setPending(data as SubmissionRow[]);
  }, [supabase]);

  useEffect(() => {
    // Async load from Supabase after mount (no window on SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      setSignedIn(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", uid)
        .maybeSingle();
      if (profile?.display_name) setDisplayName(profile.display_name);
      const { data: admin } = await supabase.rpc("am_i_admin");
      if (admin) {
        setIsAdmin(true);
        void loadPending();
      }
    });
  }, [loadPending, reload, supabase]);

  const onPick = (bg: Background) => {
    if (pinned === bg.id) {
      pinBackground(null);
      setPinned(null);
    } else {
      pinBackground(bg.id);
      setPinned(bg.id);
    }
  };

  const submit = useCallback(async () => {
    setError(null);
    setMessage(null);
    const file = fileRef.current?.files?.[0];
    if (!supabase || !file) return setError("Pick an image first.");
    if (!signedIn) return setError("Sign in with Discord to submit.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setError("JPG, PNG or WebP only.");
    }
    if (file.size > MAX_BYTES) return setError("Max file size is 2 MB.");

    // Compress before upload (D30): downscale to <=1920px, JPEG <= ~500KB.
    let payload: Blob = file;
    let width = 0;
    try {
      const compressed = await compressBackground(file);
      payload = compressed.blob;
      width = compressed.width;
    } catch {
      return setError("Could not read the image.");
    }
    if (width < MIN_WIDTH) {
      return setError(`Image must be at least ${MIN_WIDTH}px wide (got ${width}).`);
    }

    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setBusy(false);
        return setError("Sign in with Discord to submit.");
      }
      const path = `submissions/${uid}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await supabase.storage.from("backgrounds").upload(path, payload, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      });
      if (upErr) throw new Error(upErr.message);
      const { error: insErr } = await supabase.from("background_submissions").insert({
        user_id: uid,
        author_name: displayName || "anonymous",
        storage_path: path,
        title: bgTitle.trim() || null,
        description: bgDesc.trim() || null,
      });
      if (insErr) throw new Error(insErr.message);
      setMessage("Sent for approval — thanks! It appears once approved.");
      if (fileRef.current) fileRef.current.value = "";
      setBgTitle("");
      setBgDesc("");
      if (isAdmin) void loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }, [bgDesc, bgTitle, displayName, isAdmin, loadPending, signedIn, supabase]);

  const decide = useCallback(
    async (id: string, approve: boolean) => {
      if (!supabase) return;
      setBusy(true);
      const { error: err } = await supabase.rpc(
        approve ? "approve_background" : "reject_background",
        {
          p_id: id,
        },
      );
      setBusy(false);
      if (err) setError(err.message);
      else {
        setPending((rows) => rows.filter((r) => r.id !== id));
        if (approve) void reload(true);
      }
    },
    [reload, supabase],
  );

  const cfgUrl = supabase
    ? typeof window !== "undefined" && window.__GREGDLE_SUPABASE__
      ? window.__GREGDLE_SUPABASE__.url
      : ""
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Backgrounds"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl border border-edge bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-black">
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
            Backgrounds
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge bg-surface2 text-lg font-black text-muted hover:border-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2" role="tablist" aria-label="Background tabs">
          {(["gallery", "submit", ...(isAdmin ? (["approve"] as const) : [])] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`btn ${tab === t ? "btn-primary" : ""}`}
              onClick={() => {
                setTab(t as typeof tab);
                if (t === "approve") void loadPending();
              }}
            >
              {t === "gallery"
                ? "Gallery"
                : t === "submit"
                  ? "Submit"
                  : `Approve${pending.length ? ` (${pending.length})` : ""}`}
            </button>
          ))}
        </div>

        {error && <p className="text-sm font-bold text-bad">{error}</p>}
        {message && <p className="text-sm font-bold text-good">{message}</p>}

        {tab === "gallery" && (
          <div>
            {items.length === 0 ? (
              <p className="text-sm text-muted">No backgrounds yet — be the first to submit one!</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((bg) => (
                  <figure key={bg.id} className="flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bg.url}
                      alt={`Background by ${bg.author}`}
                      className={`h-24 w-full rounded-lg border object-cover ${
                        pinned === bg.id ? "border-accent" : "border-edge"
                      }`}
                    />
                    <figcaption className="flex items-center justify-between gap-1 text-xs">
                      <span className="truncate text-muted" title={bg.title ?? undefined}>
                        {bg.title ?? `by ${bg.author}`}
                      </span>
                      <button
                        type="button"
                        className="rounded border border-edge px-1.5 py-0.5 font-bold hover:border-accent"
                        onClick={() => onPick(bg)}
                      >
                        {pinned === bg.id ? "Shuffle" : "Use"}
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              {pinned
                ? "Pinned — opens with your favorite every time."
                : "Carousel mode — a new background every 30 seconds."}
            </p>
          </div>
        )}

        {tab === "submit" && (
          <div className="flex flex-col gap-3">
            <div
              className={
                signedIn
                  ? "flex flex-col gap-3"
                  : "flex cursor-not-allowed flex-col gap-3 opacity-40"
              }
              title={signedIn ? undefined : "Login to Discord to upload"}
            >
              <p className="text-sm text-muted">
                Landscape images work best (at least {MIN_WIDTH}px wide, JPG/PNG/WebP up to 2 MB).
                Everything is compressed automatically before upload — roughly 500 KB is stored
                per image. Credited as{" "}
                <span className="font-bold text-foreground">
                  {signedIn ? displayName : "your Discord name"}
                </span>
                . Submitted backgrounds appear after approval.
              </p>
              <input
                type="text"
                value={bgTitle}
                onChange={(e) => setBgTitle(e.target.value)}
                maxLength={80}
                placeholder="Title (e.g. Distant Fusion Sunset)"
                aria-label="Background title"
                disabled={!signedIn}
                className="rounded-lg border border-edge bg-surface2 px-3 py-2 text-sm font-semibold focus:border-accent focus:outline-none"
              />
              <textarea
                value={bgDesc}
                onChange={(e) => setBgDesc(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder="Description (optional, shown on your profile gallery)"
                aria-label="Background description"
                disabled={!signedIn}
                className="rounded-lg border border-edge bg-surface2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Background image file"
                disabled={!signedIn}
                className="rounded-lg border border-edge bg-surface2 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-accent/20 file:px-2 file:py-1 file:font-bold"
              />
              <button
                type="button"
                className="btn btn-primary self-start"
                disabled={busy || !signedIn}
                onClick={submit}
              >
                {busy ? "Uploading…" : "Submit for approval"}
              </button>
            </div>
            {!signedIn && (
              <p className="text-sm font-semibold text-muted">
                Login to Discord (top right) to upload.
              </p>
            )}
          </div>
        )}

        {tab === "approve" && isAdmin && (
          <div className="flex flex-col gap-3">
            {pending.length === 0 ? (
              <p className="text-sm text-muted">No pending submissions.</p>
            ) : (
              pending.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-edge bg-surface2 p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${cfgUrl}/storage/v1/object/public/backgrounds/${r.storage_path}`}
                    alt={`Submission by ${r.author_name}`}
                    className="h-16 w-28 rounded border border-edge object-cover"
                  />
                  <div className="flex-1 text-xs text-muted">
                    by <span className="font-bold text-foreground">{r.author_name}</span>
                    <br />
                    {new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => decide(r.id, true)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => decide(r.id, false)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
