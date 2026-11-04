"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { migrateGuestResults } from "@/lib/game/migrate";
import { canonicalSiteUrl } from "@/lib/site";

/**
 * Sign-in panel (D22/D25/D28): Discord OAuth only. Display names are taken from the Discord tag (or email
 * prefix) and are NEVER editable — the profile row is provisioned
 * automatically on first login, with numeric suffixes resolving collisions.
 */

type Phase = "loading" | "signed-out" | "provisioning" | "signed-in";

export function AuthPanel({ compact = false }: { compact?: boolean }) {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [discordId, setDiscordId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

      const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
      // Discord's avatar/id may live in user_metadata OR identity_data
      // depending on the Supabase auth version — check both.
      const identity = user.identities?.find((i) => i.provider === "discord");
      const idData = (identity?.identity_data ?? {}) as Record<string, string | undefined>;
      const avatar = meta.avatar_url ?? idData.avatar_url;
      const providerId = String(identity?.id ?? idData.provider_id ?? meta.provider_id ?? "");
      if (avatar)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAvatarUrl(avatar);
      if (providerId)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDiscordId(providerId);

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
      options: { redirectTo: canonicalSiteUrl() },
    });
    if (err) setError(err.message);
  }, [supabase]);

  // One-time guest -> account migration of locally-played dailies (D23),
  // plus keeping the Discord avatar in sync (D27).
  useEffect(() => {
    if (phase !== "signed-in" || !supabase) return;
    void migrateGuestResults();
    if (!avatarUrl && !discordId) return;
    void supabase
      .rpc("set_my_avatar", {
        p_avatar_url: avatarUrl,
        p_discord_id: discordId,
      })
      .then(() => {
        // The server-rendered profile picked up the new avatar — re-render it.
        router.refresh();
      });
  }, [phase, avatarUrl, discordId, supabase, router]);

  const signOutAndClose = useCallback(async () => {
    setMenuOpen(false);
    await signOut();
  }, [signOut]);

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
          Continue with Discord
        </button>
        {error && <p className="max-w-[16rem] text-xs font-bold text-bad">{error}</p>}
      </div>
    );
  }

  // Signed in: avatar + name chip opens a small menu (profile / sign out).
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="chip max-w-[14rem] border-good/60 py-1 pl-1 pr-3 hover:border-accent"
        title="Account menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-6 w-6 rounded-full border border-edge object-cover"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-edge bg-surface2 text-[11px] font-black">
            {displayName.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="truncate font-bold text-foreground">{displayName}</span>
        <span className="online-dot" aria-hidden="true" />
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-40 flex w-44 flex-col gap-1 rounded-xl border border-edge bg-surface p-1.5 shadow-xl"
          >
            <Link
              href={`/u/${encodeURIComponent(displayName)}`}
              role="menuitem"
              className="rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-surface2"
              onClick={() => setMenuOpen(false)}
            >
              View profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={signOutAndClose}
              className="rounded-lg px-3 py-2 text-left text-sm font-bold text-muted hover:bg-surface2 hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
