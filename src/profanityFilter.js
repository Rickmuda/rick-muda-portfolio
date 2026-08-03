// Basic profanity/slur filter for the scoreboard name field. Not meant to be
// comprehensive or unbeatable (unicode tricks, spacing, and new words will
// always slip past a static list) - it raises the bar against casual
// submissions, the same spirit as the score-plausibility CHECK constraint in
// supabase/schema.sql. Checked client-side only (see leaderboard.js).

// Kept short and generic on purpose - common English profanity/slurs only.
const BLOCKLIST = [
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "pussy",
  "whore", "slut", "faggot", "fag", "retard", "nigger", "nigga", "spic",
  "chink", "kike", "tranny", "rape", "nazi", "hitler",
];

// Common leetspeak substitutions, so "fuk", "sh1t", "n1gger" etc. still match.
const LEET_MAP = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

function normalize(text) {
  let out = text.toLowerCase();
  for (const [from, to] of Object.entries(LEET_MAP)) {
    out = out.split(from).join(to);
  }
  // Strip anything that isn't a letter so spacing/punctuation tricks
  // ("f u c k", "f.u.c.k") still collapse to a matchable word.
  return out.replace(/[^a-z]/g, "");
}

export function containsProfanity(text) {
  const normalized = normalize(text || "");
  return BLOCKLIST.some((word) => normalized.includes(word));
}
