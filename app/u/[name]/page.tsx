import Link from "next/link";
import { notFound } from "next/navigation";
import { computeProfileStats, type ProfileResultRow } from "@/lib/game/profile";
import { StreakFire } from "@/components/game/StreakFire";
import { CopyTagButton, SocialLinks } from "@/components/profile/ProfileIdentity";
import { Lightbox } from "@/components/ui/Lightbox";
import { MaybeProfileEdit } from "@/components/profile/MaybeProfileEdit";
import { ProfileAllWallpapers } from "@/components/profile/ProfileAllWallpapers";

/**
 * Public profile (D24): /u/<displayName>. Sourced from the profile_page RPC —
 * finished dailies + profile fields only. Names come from the Discord tag
 * and are not editable (D25).
 */

export const dynamic = "force-dynamic";

interface Payload {
  profile: {
    display_name: string;
    joined: string;
    avatar_url: string | null;
    discord_id: string | null;
    title: string | null;
    bio: string | null;
    reddit: string | null;
    twitter: string | null;
  } | null;
  results: ProfileResultRow[];
  backgrounds: {
    id: string;
    path: string;
    title: string | null;
    description: string | null;
    source_url: string | null;
    author: string;
  }[];
}

async function loadProfile(name: string): Promise<Payload | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/profile_page`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_display_name: name }),
      // Fresh every render: the wallpaper gallery and avatar sync update often.
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Payload;
  } catch {
    return null;
  }
}

export default async function ProfilePage(props: { params: Promise<{ name: string }> }) {
  const { name } = await props.params;
  const displayName = decodeURIComponent(name);
  const data = await loadProfile(displayName);
  if (!data?.profile) notFound();

  const joined = new Date(data.profile.joined).toISOString().slice(0, 10);
  const easy = computeProfileStats(data.results.filter((r) => r.difficulty === "easy"));
  const hard = computeProfileStats(data.results.filter((r) => r.difficulty === "hard"));
  const total = {
    played: easy.played + hard.played,
    wins: easy.wins + hard.wins,
    last: [easy.lastPlayed, hard.lastPlayed].filter(Boolean).sort().pop() ?? null,
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-12">
      <header className="mt-2 flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {data.profile.avatar_url ? (
            data.profile.discord_id ? (
              <a
                href={`https://discord.com/users/${data.profile.discord_id}`}
                target="_blank"
                rel="noreferrer"
                title={`${displayName} on Discord`}
                className="rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.profile.avatar_url}
                  alt={displayName}
                  className="h-16 w-16 rounded-2xl border border-edge object-cover transition hover:border-accent"
                />
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.profile.avatar_url}
                alt={displayName}
                className="h-16 w-16 rounded-2xl border border-edge object-cover"
              />
            )
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-edge bg-surface2 text-3xl font-black">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black">{displayName}</h1>
            {data.profile.title && (
              <p className="text-sm font-bold text-accent">{data.profile.title}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="label">OPERATOR // SINCE {joined}</p>
              <CopyTagButton tag={displayName} />
            </div>
            <div className="mt-1">
              <SocialLinks reddit={data.profile.reddit} twitter={data.profile.twitter} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MaybeProfileEdit
            profileName={displayName}
            initial={{
              title: data.profile.title ?? "",
              bio: data.profile.bio ?? "",
              reddit: data.profile.reddit ?? "",
              twitter: data.profile.twitter ?? "",
            }}
          />
          <Link href="/" className="btn">
            Home
          </Link>
        </div>
      </header>

      {data.profile.bio && (
        <section aria-label="Bio" className="panel w-full p-4 text-sm leading-relaxed">
          {data.profile.bio}
        </section>
      )}

      {/* Streaks — Minecraft fire badges */}
      <section
        aria-label="Streaks"
        className="panel flex w-full flex-wrap items-center justify-around gap-4 p-5"
      >
        <div className="flex flex-col items-center gap-1">
          <StreakFire n={easy.currentStreak} size={72} />
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Easy streak</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <StreakFire n={hard.currentStreak} size={72} />
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Hard streak</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-pixel text-4xl leading-none tabular-nums">
            {easy.maxStreak}/{hard.maxStreak}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Best streaks E/H
          </span>
        </div>
      </section>

      {/* Per-difficulty stats */}
      {(["easy", "hard"] as const).map((difficulty) => {
        const s = difficulty === "easy" ? easy : hard;
        if (s.played === 0) {
          return (
            <section key={difficulty} className="panel w-full p-5 text-sm text-muted">
              No {difficulty} games played yet.
            </section>
          );
        }
        const winPct = Math.round((s.wins / s.played) * 100);
        return (
          <section key={difficulty} className="panel w-full p-5">
            <h2 className="text-base font-black">
              {difficulty === "easy" ? "Easy" : "Hard"} dailies
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              <Stat label="Played" value={s.played} />
              <Stat label="Won" value={`${s.wins} (${winPct}%)`} />
              <Stat label="Streak" value={s.currentStreak} />
              <Stat label="Best win" value={s.bestWin ?? "—"} />
              <Stat label="Best streak" value={s.maxStreak} />
            </div>
            {Object.keys(s.distribution).length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Guess distribution
                </h3>
                {Object.entries(s.distribution)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([guesses, wins]) => (
                    <div key={guesses} className="mt-1 flex items-center gap-2 text-sm">
                      <span className="w-6 text-right font-bold tabular-nums">{guesses}</span>
                      <div
                        className="rounded bg-accent/80 px-1 text-[13px] font-bold text-[#221604]"
                        style={{
                          width: `${Math.max(10, (wins / Math.max(...Object.values(s.distribution))) * 100)}%`,
                          minWidth: "2rem",
                        }}
                      >
                        {wins}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Recent results */}
      {data.results.length > 0 && (
        <section className="panel w-full overflow-hidden">
          <h2 className="p-5 pb-3 text-base font-black">Recent dailies</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-edge text-left text-xs font-bold uppercase tracking-wider text-muted">
                <th className="px-5 py-2">Date</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2 text-right">Guesses</th>
                <th className="px-5 py-2 text-right">Hints</th>
              </tr>
            </thead>
            <tbody>
              {data.results.slice(0, 12).map((r, i) => (
                <tr key={`${r.date}-${i}`} className="border-b border-edge/40 last:border-0">
                  <td className="px-5 py-2 font-bold tabular-nums">{r.date}</td>
                  <td className="px-3 py-2">
                    <span className={r.won ? "font-bold text-good" : "text-muted"}>
                      {r.difficulty} {r.won ? "· won" : "· lost"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">
                    {r.guesses ?? "—"}
                  </td>
                  <td className="px-5 py-2 text-right text-muted tabular-nums">
                    {r.hints > 0 ? r.hints : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Wallpapers by this user (D24/D33): approved gallery, or the empty state. */}
      {data.backgrounds.length > 0 ? (
        <section aria-label="Backgrounds by this player" className="panel w-full p-5">
          <h2 className="text-base font-black">Backgrounds</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.backgrounds.map((bg) => (
              <figure key={bg.id} className="flex flex-col gap-1">
                <Lightbox
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/backgrounds/${bg.path}`}
                  caption={bg.title ?? `by ${displayName}`}
                  className="rounded-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/backgrounds/${bg.path}`}
                    alt={bg.title ?? `Background by ${displayName}`}
                    className="h-24 w-full rounded-lg border border-edge object-cover"
                  />
                </Lightbox>
                <figcaption className="text-xs text-muted">
                  <span className="block truncate font-bold text-foreground">
                    {bg.title ?? "Untitled"}
                  </span>
                  {bg.author.toLowerCase() !== displayName.toLowerCase() ? (
                    <span className="block truncate">
                      original by <span className="font-bold">{bg.author}</span>
                      {bg.source_url && (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={bg.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline"
                          >
                            source
                          </a>
                        </>
                      )}
                    </span>
                  ) : (
                    bg.description && <span className="line-clamp-2">{bg.description}</span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : (
        <section aria-label="Backgrounds" className="panel w-full p-5 text-sm text-muted">
          This user has not uploaded any Wallpapers
        </section>
      )}

      <p className="text-xs text-muted">
        {total.played} dailies played · {total.wins} won
        {total.last ? ` · last played ${total.last}` : ""}
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-edge bg-surface2 px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="font-pixel text-3xl leading-tight tabular-nums">{value}</div>
    </div>
  );
}
