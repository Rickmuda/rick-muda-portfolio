<template>
  <div class="ad-window">
    <!-- Checking the session -->
    <div v-if="checking" class="ad-center">{{ $t('adminLoading') }}</div>

    <!-- Login -->
    <form v-else-if="!admin.loggedIn" class="ad-login" @submit.prevent="doLogin">
      <font-awesome-icon icon="lock" class="ad-login-icon" />
      <h2>{{ $t('admin') }}</h2>
      <input
        ref="password"
        v-model="password"
        type="password"
        class="ad-input"
        :placeholder="$t('adminPassword')"
        autocomplete="current-password"
      />
      <button type="submit" class="ad-btn primary" :disabled="loggingIn || !password">
        {{ $t('adminLogin') }}
      </button>
      <div v-if="loginError" class="ad-message error">{{ loginError }}</div>
    </form>

    <!-- Panel -->
    <template v-else>
      <header class="ad-header">
        <div class="ad-tabs" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.key"
            class="ad-tab"
            :class="{ active: tab === t.key }"
            role="tab"
            :aria-selected="tab === t.key"
            @click="tab = t.key"
          >
            {{ $t(t.labelKey) }}
          </button>
        </div>
        <div class="ad-actions">
          <span v-if="dirty" class="ad-dirty">{{ $t('adminUnsaved') }}</span>
          <span v-if="message" class="ad-message" :class="message.type">{{ message.text }}</span>
          <button v-if="dirty" class="ad-btn" @click="discard">{{ $t('adminDiscard') }}</button>
          <button class="ad-btn primary" :disabled="!draft || saving || (!dirty && !isDefault)" @click="save">
            <font-awesome-icon icon="floppy-disk" /> {{ saving ? $t('adminSaving') : $t('adminSave') }}
          </button>
          <button class="ad-btn" :title="$t('adminLogout')" @click="doLogout">
            <font-awesome-icon icon="right-from-bracket" />
          </button>
        </div>
      </header>

      <div v-if="!draft" class="ad-center">{{ loadError || $t('adminLoading') }}</div>

      <div v-else class="ad-body">
        <p v-if="isDefault && tab !== 'scores'" class="ad-note">{{ $t('adminFallbackNote') }}</p>

        <!-- Projects -->
        <section v-if="tab === 'projects'" class="ad-projects">
          <div class="ad-list-col">
            <div class="ad-toolbar">
              <button class="ad-btn primary" @click="addProject">
                <font-awesome-icon icon="plus" /> {{ $t('adminNewProject') }}
              </button>
              <span class="ad-hint">{{ $t('adminDragHint') }}</span>
            </div>
            <ul class="ad-list">
              <li
                v-for="(p, i) in draft.projects"
                :key="p.id"
                class="ad-row"
                :class="{ active: editingId === p.id, hidden: p.hidden, dragging: isDragging(draft.projects, i) }"
                draggable="true"
                @dragstart="dragStart(draft.projects, i, $event)"
                @dragover.prevent="dragOver(draft.projects, i)"
                @dragend="dragEnd"
                @drop.prevent="dragEnd"
              >
                <font-awesome-icon icon="grip-vertical" class="ad-grip" />
                <img v-if="p.images.length" :src="resolveImage(p.images[0])" class="ad-row-thumb" alt="" />
                <span v-else class="ad-row-thumb empty"></span>
                <span class="ad-row-title">
                  {{ titleOf(p) }}
                  <small>{{ p.type }}<template v-if="p.status"> - {{ p.status }}</template></small>
                </span>
                <span v-if="p.hidden" class="ad-badge">{{ $t('adminHidden') }}</span>
                <div class="ad-row-buttons">
                  <button class="ad-icon-btn" :title="p.hidden ? $t('adminShow') : $t('adminHide')" @click="p.hidden = !p.hidden">
                    <font-awesome-icon :icon="p.hidden ? 'eye-slash' : 'eye'" />
                  </button>
                  <button class="ad-icon-btn" :title="$t('adminEdit')" @click="editingId = editingId === p.id ? null : p.id">
                    <font-awesome-icon icon="pen" />
                  </button>
                  <template v-if="confirmDeleteId === p.id">
                    <button class="ad-btn danger small" @click="removeProject(i)">{{ $t('adminYes') }}</button>
                    <button class="ad-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
                  </template>
                  <button v-else class="ad-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = p.id">
                    <font-awesome-icon icon="trash" />
                  </button>
                  <span class="ad-move">
                    <button class="ad-icon-btn" :disabled="i === 0" aria-label="Up" @click="move(draft.projects, i, -1)">&#9650;</button>
                    <button class="ad-icon-btn" :disabled="i === draft.projects.length - 1" aria-label="Down" @click="move(draft.projects, i, 1)">&#9660;</button>
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="editingProject" class="ad-edit-col">
            <div class="ad-edit-head">
              <h3>{{ titleOf(editingProject) }}</h3>
              <button class="ad-btn" @click="editingId = null">{{ $t('adminDone') }}</button>
            </div>
            <div class="ad-grid2">
              <label v-for="lang in langs" :key="'t' + lang" class="ad-field">
                <span>{{ $t('adminTitle') }} ({{ lang.toUpperCase() }})</span>
                <input
                  v-model="editingProject.title[lang]"
                  class="ad-input"
                  :placeholder="defaultTranslation(lang, editingProject.titleKey)"
                />
              </label>
              <label v-for="lang in langs" :key="'d' + lang" class="ad-field">
                <span>{{ $t('adminDescription') }} ({{ lang.toUpperCase() }})</span>
                <textarea
                  v-model="editingProject.description[lang]"
                  class="ad-input"
                  rows="6"
                  :placeholder="defaultTranslation(lang, editingProject.descKey)"
                ></textarea>
              </label>
              <label class="ad-field">
                <span>{{ $t('adminType') }}</span>
                <input v-model="editingProject.type" class="ad-input" list="ad-types" />
              </label>
              <label class="ad-field">
                <span>{{ $t('adminDate') }}</span>
                <input v-model="editingProject.dateCreated" type="date" class="ad-input" />
              </label>
              <label class="ad-field">
                <span>{{ $t('adminLink') }}</span>
                <input v-model="editingProject.link" type="url" class="ad-input" />
              </label>
              <label class="ad-field">
                <span>{{ $t('adminRepository') }}</span>
                <input v-model="editingProject.repository" type="url" class="ad-input" />
              </label>
              <label class="ad-field">
                <span>{{ $t('adminStatus') }}</span>
                <input v-model="editingProject.status" class="ad-input" list="ad-statuses" :placeholder="$t('adminStatusNone')" />
              </label>
              <label class="ad-field ad-check">
                <input v-model="editingProject.disabled" type="checkbox" />
                <span>{{ $t('adminDisabled') }}</span>
              </label>
            </div>
            <datalist id="ad-types">
              <option v-for="t in knownTypes" :key="t" :value="t" />
            </datalist>
            <datalist id="ad-statuses">
              <option v-for="s in knownStatuses" :key="s" :value="s" />
            </datalist>

            <h4>{{ $t('adminPhotos') }}</h4>
            <div class="ad-photos">
              <div
                v-for="(img, i) in editingProject.images"
                :key="img"
                class="ad-photo"
                :class="{ dragging: isDragging(editingProject.images, i) }"
                draggable="true"
                @dragstart="dragStart(editingProject.images, i, $event)"
                @dragover.prevent="dragOver(editingProject.images, i)"
                @dragend="dragEnd"
                @drop.prevent="dragEnd"
              >
                <img :src="resolveImage(img)" alt="" />
                <button class="ad-photo-remove" :title="$t('adminDelete')" @click="editingProject.images.splice(i, 1)">
                  <font-awesome-icon icon="xmark" />
                </button>
              </div>
              <span v-if="!editingProject.images.length" class="ad-hint">{{ $t('adminNoPhotos') }}</span>
            </div>
            <label class="ad-btn upload" :class="{ disabled: uploading }">
              <font-awesome-icon icon="upload" /> {{ uploading ? $t('adminUploading') : $t('adminUpload') }}
              <input type="file" accept="image/webp,image/jpeg,image/png,image/gif" multiple hidden :disabled="uploading" @change="uploadProjectImages" />
            </label>
          </div>
        </section>

        <!-- Art gallery -->
        <section v-else-if="tab === 'art'">
          <div class="ad-toolbar">
            <label class="ad-btn primary upload" :class="{ disabled: uploading }">
              <font-awesome-icon icon="upload" /> {{ uploading ? $t('adminUploading') : $t('adminUpload') }}
              <input type="file" accept="image/webp,image/jpeg,image/png,image/gif" multiple hidden :disabled="uploading" @change="uploadArt" />
            </label>
            <span class="ad-hint">{{ $t('adminDragHint') }}</span>
          </div>
          <div class="ad-art-grid">
            <div
              v-for="(a, i) in draft.art"
              :key="a.id"
              class="ad-art"
              :class="{ hidden: a.hidden, dragging: isDragging(draft.art, i) }"
              draggable="true"
              @dragstart="dragStart(draft.art, i, $event)"
              @dragover.prevent="dragOver(draft.art, i)"
              @dragend="dragEnd"
              @drop.prevent="dragEnd"
            >
              <img :src="resolveImage(a.src)" alt="" />
              <input v-model="a.name" class="ad-input" :aria-label="$t('adminPhotoName')" />
              <div class="ad-row-buttons">
                <button class="ad-icon-btn" :title="a.hidden ? $t('adminShow') : $t('adminHide')" @click="a.hidden = !a.hidden">
                  <font-awesome-icon :icon="a.hidden ? 'eye-slash' : 'eye'" />
                </button>
                <button class="ad-icon-btn" :disabled="i === 0" aria-label="Left" @click="move(draft.art, i, -1)">&#9664;</button>
                <button class="ad-icon-btn" :disabled="i === draft.art.length - 1" aria-label="Right" @click="move(draft.art, i, 1)">&#9654;</button>
                <template v-if="confirmDeleteId === a.id">
                  <button class="ad-btn danger small" @click="draft.art.splice(i, 1); confirmDeleteId = null">{{ $t('adminYes') }}</button>
                  <button class="ad-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
                </template>
                <button v-else class="ad-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = a.id">
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Texts -->
        <section v-else-if="tab === 'texts'" class="ad-texts">
          <div class="ad-toolbar">
            <input v-model="textSearch" class="ad-input grow" :placeholder="$t('adminTextsSearch')" />
            <label class="ad-check">
              <input v-model="onlyChangedTexts" type="checkbox" />
              <span>{{ $t('adminTextsOnlyChanged') }}</span>
            </label>
          </div>
          <p class="ad-hint">
            {{ $t('adminTextsHint', { example: '{name}', at: "{'@'}", open: "{'{'}", close: "{'}'}" }) }}
          </p>
          <div v-for="key in shownTextKeys" :key="key" class="ad-text-row" :class="{ changed: isTextChanged(key) }">
            <div class="ad-text-key">
              <code>{{ key }}</code>
              <template v-if="isTextChanged(key)">
                <span class="ad-badge">{{ $t('adminTextsChanged') }}</span>
                <button class="ad-btn small" @click="resetText(key)">{{ $t('adminReset') }}</button>
              </template>
            </div>
            <div class="ad-grid2">
              <textarea
                v-for="lang in langs"
                :key="lang"
                class="ad-input"
                :rows="textRows(key)"
                :value="textValue(lang, key)"
                :aria-label="`${key} (${lang})`"
                @input="setText(lang, key, $event.target.value)"
              ></textarea>
            </div>
          </div>
          <p v-if="filteredTextKeys.length > shownTextKeys.length" class="ad-hint">
            {{ shownTextKeys.length }} / {{ filteredTextKeys.length }}
          </p>
        </section>

        <!-- Scoreboards -->
        <section v-else-if="tab === 'scores'">
          <div class="ad-toolbar">
            <button
              v-for="g in GAMES"
              :key="g.key"
              class="ad-tab"
              :class="{ active: scoreGame === g.key }"
              @click="scoreGame = g.key"
            >
              {{ $t(g.labelKey) }}
            </button>
            <template v-if="scoreGame === 'minesweeper'">
              <button
                v-for="d in DIFFICULTIES"
                :key="d"
                class="ad-tab small"
                :class="{ active: scoreVariant === d }"
                @click="scoreVariant = d"
              >
                {{ $t('mine' + d.charAt(0).toUpperCase() + d.slice(1)) }}
              </button>
            </template>
            <button class="ad-btn" @click="loadScores">{{ $t('adminScoresRefresh') }}</button>
          </div>
          <div v-if="scoresLoading" class="ad-hint">{{ $t('adminLoading') }}</div>
          <div v-else-if="scoresError" class="ad-message error">{{ $t('adminScoresError') }}</div>
          <div v-else-if="!scores.length" class="ad-hint">{{ $t('adminScoresEmpty') }}</div>
          <table v-else class="ad-table">
            <tbody>
              <tr v-for="s in scores" :key="s.id">
                <td>{{ s.player_name }}</td>
                <td>{{ s.value }}<template v-if="s.metric === 'time_seconds'">s</template></td>
                <td>{{ formatDate(s.created_at) }}</td>
                <td class="ad-table-actions">
                  <template v-if="confirmDeleteId === s.id">
                    <button class="ad-btn danger small" @click="removeScore(s.id)">{{ $t('adminYes') }}</button>
                    <button class="ad-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
                  </template>
                  <button v-else class="ad-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = s.id">
                    <font-awesome-icon icon="trash" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  content,
  checkSession,
  login,
  logout,
  fetchAdminContent,
  saveContent,
  uploadImage,
  fetchScores,
  deleteScore,
  resolveImage,
  defaultText,
  textKeys,
} from "../../contentStore";

const GAMES = [
  { key: "minesweeper", labelKey: "minesweeper" },
  { key: "tetris", labelKey: "tetris" },
  { key: "flappyRick", labelKey: "flappyRick" },
  { key: "solitaire", labelKey: "solitaire" },
];
const DIFFICULTIES = ["easy", "medium", "hard"];
const MAX_SHOWN_TEXTS = 80;

const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default {
  name: "AdminPanel",
  components: { FontAwesomeIcon },
  data() {
    return {
      admin: content.admin,
      GAMES,
      DIFFICULTIES,
      langs: ["en", "nl"],
      tabs: [
        { key: "projects", labelKey: "adminTabProjects" },
        { key: "art", labelKey: "adminTabArt" },
        { key: "texts", labelKey: "adminTabTexts" },
        { key: "scores", labelKey: "adminTabScores" },
      ],
      tab: "projects",
      checking: true,
      password: "",
      loggingIn: false,
      loginError: "",
      draft: null,
      savedSnapshot: "",
      isDefault: false,
      loadError: "",
      saving: false,
      message: null, // { type: 'success' | 'error', text }
      editingId: null,
      confirmDeleteId: null,
      uploading: false,
      drag: null, // { list, index }
      textSearch: "",
      onlyChangedTexts: false,
      scoreGame: "minesweeper",
      scoreVariant: "easy",
      scores: [],
      scoresLoading: false,
      scoresError: false,
    };
  },
  computed: {
    dirty() {
      return !!this.draft && JSON.stringify(this.draft) !== this.savedSnapshot;
    },
    editingProject() {
      return this.draft?.projects.find((p) => p.id === this.editingId) || null;
    },
    knownTypes() {
      return [...new Set((this.draft?.projects || []).map((p) => p.type).filter(Boolean))];
    },
    knownStatuses() {
      const base = ["W.I.P", "Outdated", "Private", "Download only", "Scrapped"];
      return [...new Set([...base, ...(this.draft?.projects || []).map((p) => p.status).filter(Boolean)])];
    },
    allTextKeys() {
      return textKeys().filter((k) => !k.startsWith("admin"));
    },
    filteredTextKeys() {
      const q = this.textSearch.trim().toLowerCase();
      return this.allTextKeys.filter((key) => {
        if (this.onlyChangedTexts && !this.isTextChanged(key)) return false;
        if (!q) return true;
        return (
          key.toLowerCase().includes(q) ||
          this.langs.some((lang) => (this.textValue(lang, key) || "").toLowerCase().includes(q))
        );
      });
    },
    shownTextKeys() {
      return this.filteredTextKeys.slice(0, MAX_SHOWN_TEXTS);
    },
  },
  watch: {
    tab() {
      this.confirmDeleteId = null;
      if (this.tab === "scores") this.loadScores();
    },
    scoreGame() {
      this.loadScores();
    },
    scoreVariant() {
      this.loadScores();
    },
  },
  async mounted() {
    window.addEventListener("beforeunload", this.onBeforeUnload);
    await checkSession();
    this.checking = false;
    if (this.admin.loggedIn) {
      this.loadDraft();
    } else {
      this.$nextTick(() => this.$refs.password?.focus());
    }
  },
  beforeUnmount() {
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    clearTimeout(this.messageTimer);
  },
  methods: {
    resolveImage,
    onBeforeUnload(e) {
      if (this.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    },
    flash(type, key) {
      this.message = { type, text: this.$t(key) };
      clearTimeout(this.messageTimer);
      this.messageTimer = setTimeout(() => (this.message = null), 4000);
    },

    // --- auth -------------------------------------------------------------
    async doLogin() {
      this.loggingIn = true;
      this.loginError = "";
      const res = await login(this.password);
      this.loggingIn = false;
      if (res.ok) {
        this.password = "";
        this.loadDraft();
        return;
      }
      const keys = {
        invalid: "adminLoginInvalid",
        rate_limited: "adminLoginRateLimited",
        not_configured: "adminLoginNotConfigured",
      };
      this.loginError = this.$t(keys[res.reason] || "adminLoginError");
    },
    async doLogout() {
      await logout();
      this.draft = null;
      this.savedSnapshot = "";
      this.editingId = null;
    },

    // --- content ----------------------------------------------------------
    async loadDraft() {
      this.loadError = "";
      const res = await fetchAdminContent();
      if (!res) {
        this.loadError = this.$t("adminLoginError");
        return;
      }
      this.setDraft(res.content);
      this.isDefault = res.isDefault;
    },
    setDraft(data) {
      for (const p of data.projects) {
        if (!p.title || Array.isArray(p.title)) p.title = {};
        if (!p.description || Array.isArray(p.description)) p.description = {};
        if (!Array.isArray(p.images)) p.images = [];
      }
      this.draft = data;
      this.savedSnapshot = JSON.stringify(data);
    },
    discard() {
      this.setDraft(JSON.parse(this.savedSnapshot));
      this.editingId = null;
    },
    async save() {
      this.saving = true;
      const res = await saveContent(this.draft);
      this.saving = false;
      if (!res.ok) {
        this.flash("error", "adminSaveError");
        return;
      }
      const editing = this.editingId;
      this.setDraft(res.content);
      this.editingId = this.draft.projects.some((p) => p.id === editing) ? editing : null;
      this.isDefault = false;
      this.flash("success", "adminSaved");
    },

    // --- projects ---------------------------------------------------------
    titleOf(p) {
      const locale = this.$i18n.locale;
      return p.title?.[locale] || p.title?.en || this.defaultTranslation(locale, p.titleKey) || p.id;
    },
    defaultTranslation(lang, key) {
      if (!key) return "";
      const override = this.draft?.texts?.[lang]?.[key];
      return override ?? defaultText(lang, key) ?? "";
    },
    addProject() {
      const project = {
        id: newId("p"),
        title: { en: this.$t("adminNewProjectTitle") },
        description: {},
        type: "Web Project",
        dateCreated: new Date().toISOString().slice(0, 10),
        images: [],
        link: "",
        repository: "",
        status: "",
        disabled: false,
        hidden: true, // stays invisible until you choose to show it
      };
      this.draft.projects.unshift(project);
      this.editingId = project.id;
    },
    removeProject(i) {
      const [removed] = this.draft.projects.splice(i, 1);
      if (removed && removed.id === this.editingId) this.editingId = null;
      this.confirmDeleteId = null;
    },
    async uploadFiles(files, folder) {
      const urls = [];
      this.uploading = true;
      for (const file of files) {
        const url = await uploadImage(file, folder);
        if (url) urls.push({ url, file });
        else this.flash("error", "adminUploadError");
      }
      this.uploading = false;
      return urls;
    },
    async uploadProjectImages(e) {
      const project = this.editingProject;
      const files = [...e.target.files];
      e.target.value = "";
      if (!project || !files.length) return;
      const uploaded = await this.uploadFiles(files, "projects");
      project.images.push(...uploaded.map((u) => u.url));
    },
    async uploadArt(e) {
      const files = [...e.target.files];
      e.target.value = "";
      if (!files.length) return;
      const uploaded = await this.uploadFiles(files, "art");
      for (const { url, file } of uploaded) {
        this.draft.art.push({ id: newId("a"), src: url, name: file.name.replace(/\.[^.]+$/, ""), hidden: false });
      }
    },

    // --- ordering (drag & drop, plus arrow buttons for touch) -------------
    dragStart(list, index, e) {
      this.drag = { list, index };
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      }
    },
    dragOver(list, index) {
      if (!this.drag || this.drag.list !== list || this.drag.index === index) return;
      const [item] = list.splice(this.drag.index, 1);
      list.splice(index, 0, item);
      this.drag.index = index;
    },
    dragEnd() {
      this.drag = null;
    },
    isDragging(list, index) {
      return !!this.drag && this.drag.list === list && this.drag.index === index;
    },
    move(list, index, dir) {
      const target = index + dir;
      if (target < 0 || target >= list.length) return;
      const [item] = list.splice(index, 1);
      list.splice(target, 0, item);
    },

    // --- texts ------------------------------------------------------------
    textValue(lang, key) {
      return this.draft.texts[lang][key] ?? defaultText(lang, key) ?? "";
    },
    isTextChanged(key) {
      return this.langs.some((lang) => key in this.draft.texts[lang]);
    },
    setText(lang, key, value) {
      if (value === (defaultText(lang, key) ?? "")) delete this.draft.texts[lang][key];
      else this.draft.texts[lang][key] = value;
    },
    resetText(key) {
      for (const lang of this.langs) delete this.draft.texts[lang][key];
    },
    textRows(key) {
      const longest = Math.max(...this.langs.map((lang) => this.textValue(lang, key).length));
      return Math.min(8, Math.max(1, Math.ceil(longest / 60)));
    },

    // --- scoreboards ------------------------------------------------------
    async loadScores() {
      this.scoresLoading = true;
      this.scoresError = false;
      this.confirmDeleteId = null;
      const variant = this.scoreGame === "minesweeper" ? this.scoreVariant : "";
      const result = await fetchScores(this.scoreGame, variant);
      this.scoresLoading = false;
      if (result === null) {
        this.scoresError = true;
        this.scores = [];
      } else {
        this.scores = result;
      }
    },
    async removeScore(id) {
      this.confirmDeleteId = null;
      if (await deleteScore(id)) {
        this.scores = this.scores.filter((s) => s.id !== id);
      } else {
        this.scoresError = true;
      }
    },
    formatDate(value) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(this.$i18n.locale);
    },
  },
};
</script>

<style scoped>
.ad-window {
  height: 100%;
  background: #1a1a24;
  color: #fff;
  border: 2px solid #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 14px;
}

.ad-center {
  margin: auto;
  color: #c0b8cc;
  padding: 24px;
  text-align: center;
}

/* Login */
.ad-login {
  margin: auto;
  width: min(320px, 90%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  text-align: center;
}
.ad-login h2 {
  margin: 0;
}
.ad-login-icon {
  font-size: 36px;
  color: #c637e6;
  align-self: center;
}

/* Header */
.ad-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(180deg, #2a2a35, #1f1f2d);
  border-bottom: 2px solid #4f115d;
}
.ad-tabs,
.ad-actions,
.ad-toolbar,
.ad-row-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.ad-toolbar {
  margin-bottom: 10px;
}

.ad-tab,
.ad-btn,
.ad-icon-btn {
  font: inherit;
  color: #fff;
  border: 1px solid #4f115d;
  border-radius: 4px;
  background: #252535;
  cursor: pointer;
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ad-tab {
  background: transparent;
  color: #c0b8cc;
}
.ad-tab:hover,
.ad-btn:hover,
.ad-icon-btn:hover {
  background: rgba(155, 32, 183, 0.25);
}
.ad-tab.active,
.ad-btn.primary {
  background: #9b20b7;
  border-color: #c637e6;
  color: #fff;
}
.ad-btn.danger,
.ad-icon-btn.danger:hover {
  background: #a3263a;
  border-color: #d64560;
}
.ad-btn.small,
.ad-tab.small {
  padding: 3px 8px;
  font-size: 12px;
}
.ad-icon-btn {
  padding: 5px 8px;
  background: transparent;
}
.ad-btn:disabled,
.ad-icon-btn:disabled,
.ad-btn.disabled {
  opacity: 0.45;
  cursor: default;
  pointer-events: none;
}
.ad-btn.upload {
  position: relative;
}

.ad-dirty {
  color: #f0c060;
  font-size: 12px;
}
.ad-message {
  font-size: 13px;
}
.ad-message.error {
  color: #ff7b8a;
}
.ad-message.success {
  color: #7be08a;
}
.ad-hint {
  color: #8c849c;
  font-size: 12px;
}
.ad-note {
  margin: 0 0 12px;
  padding: 8px 12px;
  border-left: 3px solid #c637e6;
  background: rgba(155, 32, 183, 0.12);
  color: #d4c8e0;
}
.ad-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #4f115d;
  color: #e6c8f0;
  white-space: nowrap;
}

/* Inputs */
.ad-input {
  font: inherit;
  color: #fff;
  background: #252535;
  border: 1px solid #3a3a4d;
  border-radius: 4px;
  padding: 6px 8px;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
}
.ad-input:focus {
  outline: none;
  border-color: #c637e6;
}
.ad-input::placeholder {
  color: #6a647a;
}
.ad-input.grow {
  flex: 1;
  min-width: 160px;
  width: auto;
}
.ad-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #c0b8cc;
}
.ad-check {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #c0b8cc;
}
.ad-check input {
  accent-color: #9b20b7;
}
.ad-grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

/* Body */
.ad-body {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

/* Projects */
.ad-projects {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.ad-projects:has(.ad-edit-col) {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
}
.ad-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ad-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid #2c2c3c;
  border-radius: 4px;
  background: #1f1f2d;
  cursor: grab;
}
.ad-row.active {
  border-color: #c637e6;
}
.ad-row.hidden,
.ad-art.hidden {
  opacity: 0.55;
}
.ad-row.dragging,
.ad-art.dragging,
.ad-photo.dragging {
  outline: 2px dashed #c637e6;
}
.ad-grip {
  color: #6a647a;
}
.ad-row-thumb {
  width: 48px;
  height: 32px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
}
.ad-row-thumb.empty {
  background: #2c2c3c;
}
.ad-row-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ad-row-title small {
  display: block;
  color: #8c849c;
}
.ad-move {
  display: inline-flex;
  flex-direction: column;
}
.ad-move .ad-icon-btn {
  padding: 0 6px;
  font-size: 9px;
}

.ad-edit-col {
  border: 1px solid #2c2c3c;
  border-radius: 6px;
  padding: 12px;
  background: #1f1f2d;
  align-self: start;
}
.ad-edit-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.ad-edit-head h3,
.ad-edit-col h4 {
  margin: 0;
}
.ad-edit-col h4 {
  margin: 16px 0 8px;
}

.ad-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.ad-photo {
  position: relative;
  width: 120px;
  height: 80px;
  cursor: grab;
}
.ad-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
.ad-photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  cursor: pointer;
}
.ad-photo-remove:hover {
  background: #a3263a;
}

/* Art */
.ad-art-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.ad-art {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid #2c2c3c;
  border-radius: 6px;
  background: #1f1f2d;
  cursor: grab;
}
.ad-art img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 4px;
}

/* Texts */
.ad-text-row {
  padding: 8px 0;
  border-bottom: 1px solid #2c2c3c;
}
.ad-text-row.changed code {
  color: #f0c060;
}
.ad-text-key {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.ad-text-key code {
  color: #d4a8e8;
  font-size: 12px;
}

/* Scores */
.ad-table {
  width: 100%;
  border-collapse: collapse;
}
.ad-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #2c2c3c;
}
.ad-table-actions {
  text-align: right;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .ad-projects:has(.ad-edit-col),
  .ad-grid2 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
