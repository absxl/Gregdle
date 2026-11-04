"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { migrateGuestResults } from "@/lib/game/migrate";

/**
 * Email magic-link sign in (Supabase Auth). On first login the player picks
 * a display name; the profile row is created client-side (RLS: owner insert).
 * Auth is optional — guests keep playing with local stats only.
 */

type Phase = "loading" | "signed-out" | "email-form" | "sent" | "naming" | "signed-in";

export function AuthPanel({ compact = false }: { compact?: boolean }) {
  const supabase = getSupabaseBrowser();
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (!supabase) {
      // No env config — auth disabled; guests only. Same hydration pattern as
      // the localStorage reads (no window on SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("signed-out");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPhase("naming");
      else setPhase("signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setPhase((p) => (p === "signed-in" ? p : "naming"));
      else setPhase("signed-out");
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Ensure a profile exists; load the existing display name when it does.
  useEffect(() => {
    if (phase !== "naming" || !supabase) return;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return setPhase("signed-out");
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.display_name) {
        setDisplayName(profile.display_name);
        setPhase("signed-in");
      } else {
        // Suggest the Discord username (or email prefix) for the display name.
        const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
        const suggestion =
          meta.preferred_username ?? meta.full_name ?? meta.name ?? user.email?.split("@")[0];
        if (suggestion) setDisplayName(suggestion.slice(0, 24));
      }
    })();
  }, [phase, supabase]);

  const sendLink = useCallback(async () => {
    if (!supabase || !email.includes("@")) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setPhase("sent");
  }, [email, supabase]);

  const createProfile = useCallback(async () => {
    if (!supabase) return;
    const name = displayName.trim().slice(0, 24);
    if (name.length < 2) return setError("Pick a name (2–24 characters).");
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setBusy(false);
      return setPhase("signed-out");
    }
    const { error: err } = await supabase
      .from("profiles")
      .insert({ user_id: userData.user.id, display_name: name });
    setBusy(false);
    if (err) {
      if (err.code === "23505") setError("That name is taken — try another.");
      else setError(err.message);
      return;
    }
    setPhase("signed-in");
  }, [displayName, supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setDisplayName("");
    setPhase("signed-out");
  }, [supabase]);

  // Discord OAuth is the default sign-in (user decision D22); if the
  // provider isn't enabled in Supabase yet, surface Discord's error clearly.
  const signInWithDiscord = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  }, [supabase]);

  // Rename (account settings, D23): updates profiles.display_name; RLS
  // restricts updates to the owner's own row.
  const rename = useCallback(async () => {
    if (!supabase) return;
    const name = displayName.trim().slice(0, 24);
    if (name.length < 2) return setError("Pick a name (2–24 characters).");
    setBusy(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setBusy(false);
      return setPhase("signed-out");
    }
    const { error: err } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("user_id", userData.user.id);
    setBusy(false);
    if (err) {
      if (err.code === "23505") setError("That name is taken — try another.");
      else setError(err.message);
      return;
    }
    setRenaming(false);
  }, [displayName, supabase]);

  // One-time guest -> account migration of locally-played dailies (D23).
  useEffect(() => {
    if (phase !== "signed-in") return;
    void migrateGuestResults();
  }, [phase]);

  if (!supabase) return null; // auth unavailable (no env) — guests only

  const shell = compact ? "inline-flex items-center gap-2" : "flex flex-col gap-2";

  if (phase === "loading") return <div className={shell} aria-hidden="true" />;

  if (phase === "signed-out") {
    return (
      <div className={compact ? shell : "flex flex-col items-start gap-2"}>
        <button type="button" className="btn btn-primary" onClick={signInWithDiscord}>
          🎮 Continue with Discord
        </button>
        <button type="button" className="btn text-muted" onClick={() => setPhase("email-form")}>
          or use email
        </button>
        {error && <p className="max-w-[16rem] text-xs font-bold text-bad">{error}</p>}
      </div>
    );
  }

  if (phase === "email-form") {
    return (
      <div className={shell}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendLink()}
          placeholder="you@example.com"
          aria-label="Email for magic link"
          className="rounded-lg border border-edge bg-surface2 px-3 py-2 text-sm font-semibold focus:border-accent focus:outline-none"
        />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={sendLink}>
          Send link
        </button>
        {error && <p className="text-xs font-bold text-bad">{error}</p>}
      </div>
    );
  }

  if (phase === "sent") {
    return (
      <p className="text-sm font-semibold text-good">
        ✓ Magic link sent to {email} — check your inbox (and spam). You can close this.
      </p>
    );
  }

  if (phase === "naming") {
    return (
      <div className={shell}>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createProfile()}
          placeholder="Pick a display name"
          aria-label="Display name"
          maxLength={24}
          className="rounded-lg border border-edge bg-surface2 px-3 py-2 text-sm font-semibold focus:border-accent focus:outline-none"
        />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={createProfile}>
          Save name
        </button>
        <button type="button" className="btn" onClick={signOut}>
          Cancel
        </button>
        {error && <p className="text-xs font-bold text-bad">{error}</p>}
      </div>
    );
  }

  if (renaming) {
    return (
      <div className={shell}>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && rename()}
          placeholder="New display name"
          aria-label="New display name"
          maxLength={24}
          className="rounded-lg border border-edge bg-surface2 px-3 py-2 text-sm font-semibold focus:border-accent focus:outline-none"
        />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={rename}>
          Save
        </button>
        <button type="button" className="btn" onClick={() => setRenaming(false)}>
          Cancel
        </button>
        {error && <p className="text-xs font-bold text-bad">{error}</p>}
      </div>
    );
  }

  return (
    <div className={shell}>
      <span
        className="chip border-good/60 text-good"
        title="Signed in — your results count on the leaderboard"
      >
        ● {displayName}
      </span>
      <button
        type="button"
        className="btn"
        onClick={() => setRenaming(true)}
        aria-label="Change display name"
      >
        ✎
      </button>
      <button type="button" className="btn" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
