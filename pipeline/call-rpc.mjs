// One-off: call generate_daily_answers via REST with .env.local values.
// Run: node --env-file=.env.local pipeline/call-rpc.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const fn = process.argv[2] ?? "generate_daily_answers";
const body = process.argv[3] ? JSON.parse(process.argv[3]) : { days_ahead: 30 };

const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
console.log("status", res.status, (await res.text()).slice(0, 300));
