// One-off: create test user "testingdayone" with a won easy daily in 5
// guesses today, to verify the leaderboard end-to-end.
// Usage: node --env-file=.env.local pipeline/seed-test-user.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

// 1) Create the auth user (admin API).
const email = `testingdayone@gregdle.test`;
let userId;
const created = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: "testingdayone" },
  }),
});
const createdBody = await created.json();
if (created.ok) {
  userId = createdBody.id;
  console.log("auth user created:", userId);
} else if (createdBody.msg?.includes("already") || createdBody.error_description?.includes("already")) {
  // already exists — look them up
  const lookup = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers: H });
  const list = (await lookup.json()).users ?? [];
  userId = list.find((u) => u.email === email)?.id;
  console.log("auth user already exists:", userId);
}
if (!userId) {
  console.error("could not create/find user:", JSON.stringify(createdBody).slice(0, 300));
  process.exit(1);
}

// 2) Profile row (bypasses RLS with the service key).
const prof = await fetch(`${url}/rest/v1/profiles`, {
  method: "POST",
  headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify({ user_id: userId, display_name: "testingdayone" }),
});
console.log("profile:", prof.status);

// 3) Today's easy answer, so the fake run is consistent with reality.
const today = new Date().toISOString().slice(0, 10);
const ans = await fetch(
  `${url}/rest/v1/daily_answers?select=entry_id&date=eq.${today}&dataset=eq.gtnh:machines&difficulty=eq.easy&limit=1`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
const answerId = (await ans.json())[0]?.entry_id;
console.log("today's easy answer:", answerId);

// 4) The 5-guess winning run (4 wrong, then correct).
const pool = ["electric-furnace", "macerator", "alloy-smelter", "compressor"];
const guesses = [...pool.slice(0, 4), answerId];
const ins = await fetch(`${url}/rest/v1/game_results`, {
  method: "POST",
  headers: { ...H, Prefer: "resolution=ignore-duplicates,return=minimal" },
  body: JSON.stringify({
    user_id: userId,
    date: today,
    dataset: "gtnh:machines",
    difficulty: "easy",
    mode: "daily",
    guesses,
    won: true,
    hints_used: 0,
  }),
});
console.log("game_result:", ins.status);

// 5) Read the leaderboard as an anonymous visitor would.
const qs = new URLSearchParams({
  select: "rank,display_name,guess_count,hints_used",
  dataset: "eq.gtnh:machines",
  difficulty: "eq.easy",
  date: `eq.${today}`,
  order: "rank.asc",
});
const lb = await fetch(`${url}/rest/v1/leaderboard_daily?${qs}`, {
  headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? key, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? key}` },
});
console.log("leaderboard (anon view):", JSON.stringify(await lb.json()));
