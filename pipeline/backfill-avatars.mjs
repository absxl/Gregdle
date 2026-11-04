// One-off: backfill Discord avatars + discord ids for all profiles whose
// avatar_url is null (users who signed in before the sync existed, D31).
// Usage: node --env-file=.env.local pipeline/backfill-avatars.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

let page = 1;
let updated = 0;
let skipped = 0;
for (;;) {
  const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  const users = data.users ?? [];
  if (users.length === 0) break;

  for (const u of users) {
    const identity = (u.identities ?? []).find((i) => i.provider === "discord");
    const avatar = identity?.identity_data?.avatar_url ?? u.user_metadata?.avatar_url ?? null;
    const providerId = String(
      identity?.id ?? identity?.identity_data?.provider_id ?? u.user_metadata?.provider_id ?? "",
    );
    if (!avatar) {
      skipped++;
      continue;
    }
    const patch = await fetch(`${url}/rest/v1/profiles?user_id=eq.${u.id}`, {
      method: "PATCH",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({ avatar_url: avatar, discord_id: providerId }),
    });
    if (patch.ok) updated++;
    else console.error(`patch failed for ${u.id}: ${patch.status}`);
  }

  // Supabase admin list: stop when a short page comes back.
  if (users.length < 200) break;
  page++;
}
console.log(`avatars updated: ${updated}, skipped (no discord avatar): ${skipped}`);
