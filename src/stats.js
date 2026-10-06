// Sends anonymous usage counts to public/api/stats.php: one "visit" per
// browser session and one "open" per app window opened. No cookies and no
// third parties; the server only keeps daily totals (see stats.php).
//
// Skipped entirely in the admin's own browser (flag set by contentStore.js on
// login) and during `npm run dev`, so neither skews the numbers.

const ENDPOINT = "/api/stats.php";

function enabled() {
  if (import.meta.env.DEV) return false;
  try {
    return localStorage.getItem("portfolio-admin-browser") !== "1";
  } catch (_) {
    return true;
  }
}

function send(payload) {
  if (!enabled()) return;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }))) {
      return;
    }
  } catch (_) {}
  fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

export function trackVisit({ device, lang }) {
  try {
    if (sessionStorage.getItem("portfolio-visit-tracked")) return;
    sessionStorage.setItem("portfolio-visit-tracked", "1");
  } catch (_) {}
  send({ event: "visit", device, lang });
}

const openedThisSession = new Set();

// Counts each app once per page load, so minimize/restore toggles don't inflate it.
export function trackOpen(app) {
  if (!app || openedThisSession.has(app)) return;
  openedThisSession.add(app);
  send({ event: "open", app });
}
