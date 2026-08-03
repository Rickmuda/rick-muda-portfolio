// Public unsubscribe link target. Deploy with:
//   supabase functions deploy unsubscribe
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// Supabase for every edge function in the project - nothing to configure.
//
// Deletes the subscriber row matching the token in the link (sent per-
// subscriber by scripts/send-newsletter.mjs) and returns a small HTML page.
// Uses the service role key so it can bypass RLS (the anon key used by the
// signup form on the site can only INSERT, never DELETE - see schema.sql).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function page(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Newsletter</title>
<style>
  body { font-family: system-ui, sans-serif; background: #1a1a24; color: #d0c8db; display: flex;
         align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .box { text-align: center; padding: 2rem; max-width: 420px; }
  h1 { color: #d0a8e0; font-size: 1.4rem; }
  a { color: #b98dc7; }
</style></head>
<body><div class="box">${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return page("<h1>Missing link</h1><p>This unsubscribe link is incomplete.</p>", 400);

  const { error, count } = await supabase
    .from("subscribers")
    .delete({ count: "exact" })
    .eq("unsubscribe_token", token);

  if (error) return page("<h1>Something went wrong</h1><p>Please try again later.</p>", 500);
  if (!count) return page("<h1>Link not found</h1><p>You may already be unsubscribed.</p>", 404);

  return page("<h1>You've been unsubscribed</h1><p>Sorry to see you go!</p>");
});
