"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { ProfileEditButton } from "./ProfileExtras";

/**
 * Renders the Edit-profile control only when the viewer owns this profile
 * (client session check; the page itself is server-rendered).
 */
export function MaybeProfileEdit({
  profileName,
  initial,
}: {
  profileName: string;
  initial: { title: string; bio: string; reddit: string; twitter: string; rankLabel: string };
}) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);

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
       
      setIsOwner(profile?.display_name === profileName);
    });
  }, [profileName]);

  if (!isOwner) return null;

  return <ProfileEditButton initial={initial} onSaved={() => router.refresh()} />;
}
