// Verify daily_answers rows exist and are distinct over a window.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const qs = new URLSearchParams({
  select: "date,dataset,difficulty,entry_id",
  dataset: "eq.gtnh:machines",
  order: "date.asc",
  limit: "20",
});
const res = await fetch(`${url}/rest/v1/daily_answers?${qs}`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const rows = await res.json();
console.log("status", res.status, "rows:", rows.length);
for (const r of rows.slice(0, 8)) console.log(r.date, r.difficulty, r.entry_id);
