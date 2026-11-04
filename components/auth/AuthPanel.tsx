"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { migrateGuestResults } from "@/lib/game/migrate";

/**
 * Sign-in panel (D22/D25): Discord OAuth is the default; email magic link is
 * the fallback. Display names are taken from the Discord tag (or email
 * prefix) and are NEVER editable — the profile row is provisioned
 * automatically on first login, with numeric suffixes resolving collisions.
 */

type Phase = "loading" | "signed-out" | "email-form" | "sent" | "provisioning" | "signed-in";

export function AuthPanel({ compact = false }: { compact?: boolean }) {
  const supabase = getSupabaseBrowser();
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      // No env config — auth disabled; guests only. Same hydration pattern as
      // the localStorage reads (no window on SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("signed-out");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPhase("provisioning");
      else setPhase("signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setPhase((p) => (p === "signed-in" ? p : "provisioning"));
      else setPhase("signed-out");
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Provision the profile automatically from the Discord tag (D25):
  // name = preferred_username | full_name | email prefix; collisions get
  // _2, _3… then a short id suffix. Never asks the user, never editable.
  useEffect(() => {
    if (phase !== "provisioning" || !supabase) return;
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
        return;
      }

      const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
      const base =
        (
          meta.preferred_username ??
          meta.full_name ??
          meta.name ??
          user.email?.split("@")[0] ??
          "player"
        )
          .replace(/[^\w.-]+/g, "")
          .slice(0, 20) || "player";

      const candidates = [
        base,
        ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${base}_${n}`),
        `${base}${user.id.slice(0, 4)}`,
      ];
      for (const name of candidates) {
        const { error: err } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, display_name: name });
        if (!err) {
          setDisplayName(name);
          setPhase("signed-in");
          return;
        }
        if (err.code !== "23505") break; // collision -> next candidate; other error -> bail
      }
      setPhase("signed-in");
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

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setDisplayName("");
    setPhase("signed-out");
  }, [supabase]);

  // Discord OAuth is the default sign-in (D22).
  const signInWithDiscord = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  }, [supabase]);

  // One-time guest -> account migration of locally-played dailies (D23).
  useEffect(() => {
    if (phase !== "signed-in") return;
    void migrateGuestResults();
  }, [phase]);

  if (!supabase) return null; // auth unavailable (no env) — guests only

  const shell = compact ? "inline-flex items-center gap-2" : "flex flex-col gap-2";

  if (phase === "loading" || phase === "provisioning") {
    return (
      <span className="chip" aria-busy="true">
        Signing in…
      </span>
    );
  }

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

  return (
    <div className={shell}>
      <Link
        href={`/u/${encodeURIComponent(displayName)}`}
        className="chip border-good/60 text-good hover:border-accent"
        title="Your profile"
      >
        ● {displayName}
      </Link>
      <button type="button" className="btn" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
