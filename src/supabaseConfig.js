// Shared Supabase project config, used by both the newsletter signup
// (src/newsletterConfig.js) and the game scoreboards (src/leaderboard.js).
// Safe to ship in client code: this is the public anon key, and every table
// it can touch is locked down with Row Level Security (see supabase/schema.sql).
export const SUPABASE_URL = "https://cpiptviuvzwlyomfhbax.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_pl3VzzgiCOQrcKAHXgwDKA_GoWRunco";

export function keysConfigured() {
  return !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
}
