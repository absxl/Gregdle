"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Owner-only profile editing (D29): title, bio, reddit, x.com — through the
 * update_my_profile RPC (display name stays immutable, D25). Rendered only
 * when the viewer is the profile owner.
 */

export function ProfileEditButton({
  initial,
  onSaved,
}: {
  initial: { title: string; bio: string; reddit: string; twitter: string };
  onSaved: (next: { title: string; bio: string; reddit: string; twitter: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("update_my_profile", {
      p_title: form.title.trim().slice(0, 80),
      p_bio: form.bio.trim().slice(0, 280),
      p_reddit: form.reddit
        .replace(/^(https?:\/\/)?(www\.)?(reddit\.com\/user\/)?/i, "")
        .replace(/^u\//i, "")
        .slice(0, 40),
      p_twitter: form.twitter
        .replace(/^(https?:\/\/)?(www\.)?((x\.com)|(twitter\.com)\/)?/i, "")
        .replace(/^@/, "")
        .slice(0, 30),
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved({
      title: form.title.trim(),
      bio: form.bio.trim(),
      reddit: form.reddit.trim(),
      twitter: form.twitter.trim(),
    });
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        ✎ Edit profile
      </button>
    );
  }

  const field =
    "w-full rounded-lg border border-edge bg-surface2 px-3 py-2 text-sm font-semibold focus:border-accent focus:outline-none";

  return (
    <div className="panel mt-2 flex w-full flex-col gap-2 p-4">
      <input
        type="text"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        maxLength={80}
        placeholder="Title (shown under your name)"
        aria-label="Profile title"
        className={field}
      />
      <textarea
        value={form.bio}
        onChange={(e) => setForm({ ...form, bio: e.target.value })}
        maxLength={280}
        rows={3}
        placeholder="Short bio"
        aria-label="Profile bio"
        className={field}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={form.reddit}
          onChange={(e) => setForm({ ...form, reddit: e.target.value })}
          placeholder="reddit username"
          aria-label="Reddit username"
          className={field}
        />
        <input
          type="text"
          value={form.twitter}
          onChange={(e) => setForm({ ...form, twitter: e.target.value })}
          placeholder="x.com username"
          aria-label="X username"
          className={field}
        />
      </div>
      {error && <p className="text-xs font-bold text-bad">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
          Save
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
