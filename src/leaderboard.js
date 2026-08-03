// Shared game scoreboards, via Supabase's REST API (PostgREST) - mirrors
// src/newsletterConfig.js's shape: safe-to-ship anon key, Row Level Security
// does the real access control (see supabase/schema.sql's game_scores table),
// and every call here resolves rather than throwing so a game/window never
// breaks if the network (or Supabase project) is unavailable.
//
// "metric" says how a game's `value` should be ranked: "score" (higher is
// better - Tetris, Flappy Rick) or "time_seconds" (lower is better -
// Minesweeper, Solitaire).

import { SUPABASE_URL, SUPABASE_ANON_KEY, keysConfigured } from "./supabaseConfig";

const MAX_NAME_LENGTH = 20;

// honeypot: a hidden form field that should always be empty for real users.
// A non-empty value means a bot filled in every field, so we quietly reject.
export async function submitScore({ game, variant = null, metric, playerName, value, honeypot = "" }) {
  if (honeypot) return { ok: false, reason: "rejected" };
  if (!keysConfigured()) return { ok: false, reason: "not_configured" };

  const trimmedName = (playerName || "").trim();
  if (!trimmedName || trimmedName.length > MAX_NAME_LENGTH) {
    return { ok: false, reason: "invalid_name" };
  }
  const numericValue = Math.round(Number(value));
  if (!Number.isFinite(numericValue)) return { ok: false, reason: "invalid_value" };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/game_scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        game,
        variant,
        metric,
        player_name: trimmedName,
        value: numericValue,
      }),
    });
    // A rejected CHECK constraint (implausible value/name) comes back as a
    // non-2xx status here - surfaced as a generic "error" rather than parsed
    // in detail, since the UI only needs to know whether to show success.
    if (res.ok) return { ok: true };
    return { ok: false, reason: "error" };
  } catch (_) {
    return { ok: false, reason: "error" };
  }
}

// Top N entries for one game (optionally scoped to a variant, e.g. Minesweeper
// difficulty). Always resolves to an array - [] on any failure or when
// Supabase isn't configured, so callers can render it directly without a
// separate error branch.
export async function fetchTopScores({ game, variant = null, metric, limit = 10 }) {
  if (!keysConfigured()) return [];

  const params = new URLSearchParams();
  params.set("game", `eq.${game}`);
  params.set("variant", variant ? `eq.${variant}` : "is.null");
  params.set("select", "player_name,value,created_at");
  params.set("order", metric === "time_seconds" ? "value.asc" : "value.desc");
  params.set("limit", String(limit));

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/game_scores?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}
