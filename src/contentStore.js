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
import { downloads as defaultDownloads } from "./downloadsData";
import { categories as defaultSkillCategories, skills as defaultSkills } from "./skillsData";
import { wallpapers as defaultWallpapers, defaultWallpaperId } from "./wallpapersData";
import { about as defaultAbout } from "./aboutData";

const DEFAULT_DISCOGS_USER = "Rick_muda";
const clone = (value) => JSON.parse(JSON.stringify(value));

const API = "/api";

const assetUrls = (folder, modules) =>
  Object.fromEntries(
    Object.entries(modules).map(([path, url]) => [`bundled:${folder}/${path.split("/").pop()}`, url])
  );

const bundledAssets = {
  ...assetUrls("projects", import.meta.glob("./assets/img/projects/*", { eager: true, query: "?url", import: "default" })),
  ...assetUrls("art", import.meta.glob("./assets/img/imggallery/*", { eager: true, query: "?url", import: "default" })),
  ...assetUrls("downloads", import.meta.glob("./assets/img/downloads/*", { eager: true, query: "?url", import: "default" })),
  ...assetUrls("about", import.meta.glob(["./assets/img/self-image-*", "./assets/img/certificates/*"], { eager: true, query: "?url", import: "default" })),
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
      scrapped: false,
    }));
  const art = defaultArt.map((a) => ({ id: a.name, src: a.src, name: a.name, hidden: false }));
  return { version: 1, projects, art, texts: { en: {}, nl: {} }, ...defaultSections() };
}

// The newer, optional sections. A server version saved before a section
// existed simply doesn't have it, so each one falls back on its own.
function defaultSections() {
  return {
    downloads: defaultDownloads.map((d) => ({ title: {}, description: {}, hidden: false, autoVersion: false, ...clone(d) })),
    vinyl: { username: DEFAULT_DISCOGS_USER, hidden: [], extra: [] },
    skills: {
      categories: defaultSkillCategories.map((c) => ({ ...c, label: { en: c.label } })),
      skills: defaultSkills.map((s) => ({ ...clone(s), desc: { en: s.desc } })),
    },
    wallpapers: {
      items: defaultWallpapers.map((w) => ({ label: {}, image: "", darkImage: "", css: "", darkCss: "", hidden: false, ...w })),
      defaultId: defaultWallpaperId,
    },
    about: {
      ...clone(defaultAbout),
      questions: defaultAbout.questions.map((q) => ({ label: {}, hidden: false, ...clone(q) })),
      socials: defaultAbout.socials.map((s) => ({ hidden: false, ...s })),
      certificates: defaultAbout.certificates.map((c) => ({ hidden: false, ...c })),
    },
  };
}

// About Me chat with every text resolved for the current language and every
// image/file reference turned into a URL. Hidden items are left out.
export function aboutSettings() {
  const a = section("about") || {};
  const visible = (list) => (Array.isArray(list) ? list.filter((item) => !item.hidden) : []);
  return {
    avatar: resolveImage(a.avatar),
    status: localizedText(a.status),
    greeting: itemText(a.greeting, a.greetingKey),
    questions: visible(a.questions).map((q) => ({
      id: q.id,
      label: itemText(q.label, q.labelKey, q.id),
      messages: (q.messages || []).map((m) => itemText(m.text, m.key)).filter(Boolean),
      attachment: q.attachment || "none",
    })),
    cv: a.cv && a.cv.file ? { url: a.cv.file, name: a.cv.name || "CV.pdf" } : null,
    socials: visible(a.socials).filter((s) => s.url),
    certificates: visible(a.certificates).map((c) => ({ ...c, image: resolveImage(c.image) })),
  };
}

function section(name) {
  return content.server?.[name] ?? defaultSections()[name];
}

// Download cards visible to visitors, thumbnails resolved.
export function visibleDownloads() {
  return (section("downloads") || [])
    .filter((d) => !d.hidden)
    .map((d) => ({ ...d, thumbnail: resolveImage(d.thumbnail) }));
}

// { username, hidden: [discogsId], extra: [{ id, title, artist, cover }] }
export function vinylSettings() {
  const v = section("vinyl") || {};
  return {
    username: v.username || DEFAULT_DISCOGS_USER,
    hidden: Array.isArray(v.hidden) ? v.hidden : [],
    extra: (Array.isArray(v.extra) ? v.extra : [])
      .filter((a) => !a.hidden)
      .map((a) => ({ ...a, cover: resolveImage(a.cover) })),
  };
}

export function skillTree() {
  return section("skills") || { categories: [], skills: [] };
}

// All visible wallpapers with ready-to-use CSS background values.
export function wallpaperList() {
  const w = section("wallpapers") || { items: [] };
  return (w.items || [])
    .filter((item) => !item.hidden)
    .map((item) => {
      const light = item.image ? `url('${resolveImage(item.image)}')` : item.css;
      const dark = item.darkImage ? `url('${resolveImage(item.darkImage)}')` : item.darkCss;
      return { ...item, cssValue: light, darkCssValue: dark || light };
    })
    .filter((item) => item.cssValue);
}

export function defaultWallpaper() {
  return section("wallpapers")?.defaultId || defaultWallpaperId;
}

function activeContent() {
  return content.server || defaultContent();
}

function resolvedProjects(scrapped) {
  return (activeContent().projects || [])
    .filter((p) => !p.hidden && !!p.scrapped === scrapped)
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

// Visible projects, in the admin-defined order, with image URLs resolved.
// `titleKey` stays the stable identifier the search/selection code uses.
export function visibleProjects() {
  return resolvedProjects(false);
}

// Projects marked "scrapped" in the admin panel: shown in the Recycle Bin.
export function scrappedProjects() {
  return resolvedProjects(true);
}

// Picks the current-language text from a { en, nl } field (or returns a plain
// string as-is), falling back to the other language.
export function localizedText(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  const locale = i18n.global.locale.value;
  return field[locale] || field.en || field.nl || "";
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

// Title/description of anything with optional { en, nl } fields and an i18n
// key fallback (projects, downloads, wallpapers).
// The current language's own text wins, then the i18n default for that
// language, and only then the other language's custom text.
export function itemText(field, key, fallback = "") {
  if (!field || typeof field === "string") return field || translate(key) || fallback;
  const locale = i18n.global.locale.value;
  return field[locale] || translate(key) || field.en || field.nl || fallback;
}

export function projectTitle(p) {
  return itemText(p.title, p.titleKey, p.id || "");
}

export function projectDesc(p) {
  return itemText(p.description, p.descKey);
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
  if (content.admin.loggedIn) markAdminBrowser();
  return content.admin.loggedIn;
}

// Resolves to { ok: true } or { ok: false, reason: 'invalid' | 'rate_limited' | 'not_configured' | 'error' }.
export async function login(password) {
  const res = await api("auth.php", { method: "POST", body: { action: "login", password } });
  if (res.ok && res.data?.loggedIn) {
    content.admin.loggedIn = true;
    content.admin.csrf = res.data.csrf;
    markAdminBrowser();
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
  const defaults = defaultSections();
  for (const key of Object.keys(defaults)) {
    if (data[key] === undefined || data[key] === null) data[key] = defaults[key];
  }
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

// Downloads: the files themselves live outside the web root (download-file.php).
export async function fetchDownloadFiles() {
  const res = await api("download-file.php");
  return res.ok ? { files: res.data?.files || {}, passwords: res.data?.passwords || {} } : null;
}

const CHUNK_BYTES = 2 * 1024 * 1024;

// Uploads in 2 MB chunks so big files (an .exe, an .apk) fit within the
// host's upload limit. onProgress gets 0..1. Resolves to { name, size } or null.
export async function uploadDownloadFile(id, file, onProgress = () => {}) {
  const uploadId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const total = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  for (let index = 0; index < total; index++) {
    const form = new FormData();
    form.append("action", "chunk");
    form.append("id", id);
    form.append("uploadId", uploadId);
    form.append("index", String(index));
    form.append("total", String(total));
    form.append("name", file.name);
    form.append("chunk", file.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES), "chunk");
    const res = await api("download-file.php", { method: "POST", body: form, json: false });
    if (!res.ok) return null;
    onProgress((index + 1) / total);
    if (res.data?.done) return { name: res.data.name, size: res.data.size };
  }
  return null;
}

export async function setDownloadPassword(id, password) {
  const res = await api("download-file.php", { method: "POST", body: { action: "password", id, password } });
  return res.ok;
}

export async function deleteDownloadFile(id) {
  const res = await api("download-file.php", { method: "POST", body: { action: "delete", id } });
  return res.ok;
}

export async function fetchStats(days = 30) {
  const res = await api(`stats.php?days=${days}`);
  return res.ok && Array.isArray(res.data?.days) ? res.data.days : null;
}

// Remembers (in this browser only) that the admin uses it, so src/stats.js
// leaves the admin's own visits out of the statistics.
function markAdminBrowser() {
  try {
    localStorage.setItem("portfolio-admin-browser", "1");
  } catch (_) {}
}

export async function deleteScore(id) {
  const res = await api(`scores.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  return res.ok;
}
