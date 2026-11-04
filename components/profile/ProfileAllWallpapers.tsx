"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Lightbox } from "@/components/ui/Lightbox";

/**
 * Owner-only "all my uploads" gallery (D34): every wallpaper this profile
 * has uploaded — approved, pending and rejected — with status badges.
 * Renders only when the viewer owns the profile; the public page shows the
 * approved gallery server-side.
 */

interface OwnRow {
  id: string;
  storage_path: string;
  title: string | null;
  status: string;
  author_name: string;
}

function publicUrl(path: string): string {
  const cfg =
    typeof window !== "undefined" && window.__GREGDLE_SUPABASE__
      ? window.__GREGDLE_SUPABASE__
      : null;
  const base = cfg?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/backgrounds/${path}`;
}

const STATUS_STYLE: Record<string, string> = {
  approved: "border-good/60 text-good",
  pending: "border-accent/60 text-accent",
  rejected: "border-bad/60 text-bad",
};

export function ProfileAllWallpapers({ profileName }: { profileName: string }) {
  const [rows, setRows] = useState<OwnRow[] | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", uid)
        .maybeSingle();
      if (profile?.display_name !== profileName) return;
      const { data: own } = await supabase
        .from("background_submissions")
        .select("id,storage_path,title,status,author_name")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (own) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRows(own as OwnRow[]);
      }
    });
  }, [profileName]);

  if (!rows || rows.length === 0) return null;

  return (
    <section aria-label="All my uploads" className="panel w-full p-5">
      <h2 className="text-base font-black">All my uploads</h2>
      <p className="mt-1 text-xs text-muted">
        Every wallpaper you&apos;ve uploaded — only you can see the pending and rejected ones.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <figure key={r.id} className="flex flex-col gap-1">
            <Lightbox
              src={publicUrl(r.storage_path)}
              caption={r.title ?? undefined}
              className="rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicUrl(r.storage_path)}
                alt={r.title ?? "Wallpaper"}
                className={`h-24 w-full rounded-lg border object-cover ${
                  r.status === "approved" ? "border-edge" : "border-edge opacity-60"
                }`}
              />
            </Lightbox>
            <figcaption className="flex items-center justify-between gap-1 text-xs">
              <span className="truncate font-bold text-foreground">{r.title ?? "Untitled"}</span>
              <span
                className={`shrink-0 rounded border px-1.5 py-px font-bold ${STATUS_STYLE[r.status] ?? ""}`}
              >
                {r.status}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
