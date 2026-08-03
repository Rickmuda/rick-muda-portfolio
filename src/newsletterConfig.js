// Subscribes an email to the newsletter via Supabase's REST API (PostgREST).
// Mirrors src/paintMailer.js / src/cameraMailer.js: the keys below are safe to
// ship in client code - Supabase's anon key is designed for public/browser
// use, and the `subscribers` table's Row Level Security policy only allows
// INSERT (see supabase/schema.sql), nothing else. This never throws.
//
// One-time setup (you, the portfolio owner):
//   1. Create a free project at https://supabase.com.
//   2. SQL Editor -> New query -> paste and run supabase/schema.sql.
//   3. Project Settings -> API -> copy the Project URL and the anon/public
//      key into the two constants below.
//   4. Deploy supabase/functions/unsubscribe (see that file's header comment)
//      so the unsubscribe links sent in the newsletter emails work.
//
// Until the keys below are filled in, subscribe() is a no-op that resolves
// { ok: false, reason: "not_configured" }.

const SUPABASE_URL = "https://cpiptviuvzwlyomfhbax.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pl3VzzgiCOQrcKAHXgwDKA_GoWRunco";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function keysConfigured() {
  return !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
}

// honeypot: a hidden form field that should always be empty for real users.
// A non-empty value means a bot filled in every field, so we quietly reject.
export async function subscribe(email, honeypot = "") {
  if (honeypot) return { ok: false, reason: "rejected" };
  if (!keysConfigured()) return { ok: false, reason: "not_configured" };

  const trimmed = (email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return { ok: false, reason: "invalid" };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email: trimmed }),
    });

    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, reason: "already" };
    return { ok: false, reason: "error" };
  } catch (_) {
    return { ok: false, reason: "error" };
  }
}
