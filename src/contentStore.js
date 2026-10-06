// Editable portfolio content: projects, art gallery and text overrides.
//
// The bundled defaults (src/projectsData.js, src/galleryImages.js, src/i18n.js)
// are always the fallback. On startup loadContent() asks the server
// (public/api/content.php) for the version saved from the admin panel; if
// there is one it replaces the defaults, if not (or the request fails, e.g.
// in `npm run dev` where there is no PHP) the site just keeps the defaults.
//
// Like src/leaderboard.js, every network call here resolves rather than
// throwing, so a window never breaks if the API is unavailable.

import { reactive } from "vue";
import i18n from "./i18n";
import { projects as defaultProjects } from "./projectsData";
import { galleryImages as defaultArt } from "./galleryImages";

const API = "/api";

const assetUrls = (folder, modules) =>
  Object.fromEntries(
    Object.entries(modules).map(([path, url]) => [`bundled:${folder}/${path.split("/").pop()}`, url])
  );

const bundledAssets = {
  ...assetUrls("projects", import.meta.glob("./assets/img/projects/*", { eager: true, query: "?url", import: "default" })),
  ...assetUrls("art", import.meta.glob("./assets/img/imggallery/*", { eager: true, query: "?url", import: "default" })),
};

// Snapshot of the untouched translations, so text overrides can be re-applied
// (or reset) on top of them at any time.
const defaultMessages = {
  en: { ...i18n.global.getLocaleMessage("en") },
  nl: { ...i18n.global.getLocaleMessage("nl") },
};

export const content = reactive({
  // The content saved on the server, or null when using the bundled defaults.
  server: null,
  loaded: false,
  admin: { loggedIn: false, csrf: null },
});

// ---------------------------------------------------------------------------
// Reading

export function resolveImage(ref) {
  if (typeof ref !== "string") return "";
  if (ref.startsWith("bundled:")) return bundledAssets[ref] || "";
  return ref;
}

// The defaults in the same shape as the server JSON. Projects are seeded
// newest first, which is how the Projects window used to sort them.
export function defaultContent() {
  const projects = [...defaultProjects]
    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
    .map((p) => ({
      id: p.titleKey,
      titleKey: p.titleKey,
      descKey: p.descKey,
      title: {},
      description: {},
      type: p.type || "",
      dateCreated: p.dateCreated || "",
      images: [...(p.images || [])],
      link: p.link || "",
      repository: p.repository || "",
      status: p.status || "",
      disabled: !!p.disabled,
      hidden: false,
    }));
  const art = defaultArt.map((a) => ({ id: a.name, src: a.src, name: a.name, hidden: false }));
  return { version: 1, projects, art, texts: { en: {}, nl: {} } };
}

function activeContent() {
  return content.server || defaultContent();
}

// Visible projects, in the admin-defined order, with image URLs resolved.
// `titleKey` stays the stable identifier the search/selection code uses.
export function visibleProjects() {
  return (activeContent().projects || [])
    .filter((p) => !p.hidden)
    .map((p, order) => ({
      ...p,
      titleKey: p.titleKey || p.id,
      order,
      images: (p.images || []).map(resolveImage).filter(Boolean),
      link: p.link || undefined,
      repository: p.repository || undefined,
      status: p.status || undefined,
    }));
}

export function visibleArt() {
  return (activeContent().art || [])
    .filter((a) => !a.hidden)
    .map((a) => ({ ...a, src: resolveImage(a.src) }))
    .filter((a) => a.src);
}

function translate(key) {
  return key && i18n.global.te(key) ? i18n.global.t(key) : "";
}

function localized(field) {
  if (!field) return "";
  const locale = i18n.global.locale.value;
  return field[locale] || field.en || field.nl || "";
}

export function projectTitle(p) {
  return localized(p.title) || translate(p.titleKey) || p.id || "";
}

export function projectDesc(p) {
  return localized(p.description) || translate(p.descKey) || "";
}

export function defaultText(locale, key) {
  return defaultMessages[locale]?.[key];
}

export function textKeys() {
  return Object.keys(defaultMessages.en).filter((k) => typeof defaultMessages.en[k] === "string");
}

function applyTexts(texts) {
  for (const locale of ["en", "nl"]) {
    i18n.global.setLocaleMessage(locale, { ...defaultMessages[locale], ...(texts?.[locale] || {}) });
  }
}

function applyContent(data) {
  content.server = data && typeof data === "object" ? data : null;
  applyTexts(content.server?.texts);
}

export async function loadContent() {
  try {
    const res = await fetch(`${API}/content.php`, { headers: { Accept: "application/json" } });
    if (res.ok && (res.headers.get("content-type") || "").includes("application/json")) {
      const data = await res.json();
      applyContent(data.content);
    }
  } catch (_) {
    // Offline / no PHP (dev server): keep the defaults.
  }
  content.loaded = true;
}

// ---------------------------------------------------------------------------
// Admin

async function api(path, { method = "GET", body, json = true } = {}) {
  const headers = { Accept: "application/json" };
  if (content.admin.csrf) headers["X-CSRF-Token"] = content.admin.csrf;
  if (body !== undefined && json) headers["Content-Type"] = "application/json";
  try {
    const res = await fetch(`${API}/${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : json ? JSON.stringify(body) : body,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (res.status === 401) {
      content.admin.loggedIn = false;
      content.admin.csrf = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (_) {
    return { ok: false, status: 0, data: null };
  }
}

export async function checkSession() {
  const res = await api("auth.php");
  content.admin.loggedIn = !!(res.ok && res.data?.loggedIn);
  content.admin.csrf = content.admin.loggedIn ? res.data.csrf : null;
  return content.admin.loggedIn;
}

// Resolves to { ok: true } or { ok: false, reason: 'invalid' | 'rate_limited' | 'not_configured' | 'error' }.
export async function login(password) {
  const res = await api("auth.php", { method: "POST", body: { action: "login", password } });
  if (res.ok && res.data?.loggedIn) {
    content.admin.loggedIn = true;
    content.admin.csrf = res.data.csrf;
    return { ok: true };
  }
  const reason = { 401: "invalid", 429: "rate_limited", 503: "not_configured" }[res.status] || "error";
  return { ok: false, reason };
}

export async function logout() {
  await api("auth.php", { method: "POST", body: { action: "logout" } });
  content.admin.loggedIn = false;
  content.admin.csrf = null;
}

// Full content including hidden items, as a deep copy the admin panel can
// edit. `isDefault` is true when nothing has been saved on the server yet.
export async function fetchAdminContent() {
  const res = await api("content.php?admin=1");
  if (!res.ok) return null;
  const saved = res.data?.content;
  const data = JSON.parse(JSON.stringify(saved || defaultContent()));
  // PHP encodes an empty map as [] in some cases; the editor needs objects.
  const texts = data.texts && !Array.isArray(data.texts) ? data.texts : {};
  data.texts = {
    en: texts.en && !Array.isArray(texts.en) ? texts.en : {},
    nl: texts.nl && !Array.isArray(texts.nl) ? texts.nl : {},
  };
  return { content: data, isDefault: !saved };
}

export async function saveContent(data) {
  const res = await api("content.php", { method: "PUT", body: data });
  if (!res.ok || !res.data?.content) return { ok: false, status: res.status };
  applyContent(res.data.content);
  return { ok: true, content: JSON.parse(JSON.stringify(res.data.content)) };
}

// folder: 'projects' | 'art'. Resolves to the uploaded file's URL, or null.
export async function uploadImage(file, folder) {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await api("upload.php", { method: "POST", body: form, json: false });
  return res.ok ? res.data?.url || null : null;
}

export async function fetchScores(game, variant = "") {
  const params = new URLSearchParams({ game });
  if (variant) params.set("variant", variant);
  const res = await api(`scores.php?${params.toString()}`);
  return res.ok && Array.isArray(res.data?.scores) ? res.data.scores : null;
}

export async function deleteScore(id) {
  const res = await api(`scores.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  return res.ok;
}
