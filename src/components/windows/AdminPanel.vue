<template>
  <div class="cms-window">
    <!-- Checking the session -->
    <div v-if="checking" class="cms-center">{{ $t('adminLoading') }}</div>

    <!-- Login -->
    <div v-else-if="!admin.loggedIn" class="cms-center">
      <form class="cms-login" @submit.prevent="doLogin">
        <span class="cms-login-icon"><font-awesome-icon icon="lock" /></span>
        <h2>{{ $t('admin') }}</h2>
        <p class="cms-hint">{{ $t('adminLoginIntro') }}</p>
        <input
          ref="password"
          v-model="password"
          type="password"
          class="cms-input"
          :placeholder="$t('adminPassword')"
          autocomplete="current-password"
        />
        <button type="submit" class="cms-btn primary block" :disabled="loggingIn || !password">
          {{ $t('adminLogin') }}
        </button>
        <div v-if="loginError" class="cms-message error">{{ loginError }}</div>
      </form>
    </div>

    <!-- Panel -->
    <div v-else class="cms-shell">
      <nav class="cms-sidebar" :aria-label="$t('admin')">
        <div class="cms-brand">
          <font-awesome-icon icon="lock" />
          <span>{{ $t('admin') }}</span>
        </div>
        <div v-for="group in navGroups" :key="group.labelKey" class="cms-nav-group">
          <span class="cms-nav-title">{{ $t(group.labelKey) }}</span>
          <button
            v-for="t in group.tabs"
            :key="t.key"
            type="button"
            class="cms-nav-item"
            :class="{ active: tab === t.key }"
            :data-tab="t.key"
            :aria-current="tab === t.key ? 'page' : null"
            @click="tab = t.key"
          >
            <font-awesome-icon :icon="t.icon" fixed-width />
            <span>{{ $t(t.labelKey) }}</span>
          </button>
        </div>
        <button type="button" class="cms-nav-item cms-logout" @click="doLogout">
          <font-awesome-icon icon="right-from-bracket" fixed-width />
          <span>{{ $t('adminLogout') }}</span>
        </button>
      </nav>

      <div class="cms-main">
        <header class="cms-topbar">
          <div class="cms-topbar-text">
            <h2>{{ $t(currentTab.labelKey) }}</h2>
            <p>{{ $t('adminDesc_' + tab) }}</p>
          </div>
          <div v-if="!readOnlyTab" class="cms-actions">
            <span v-if="message" class="cms-message" :class="message.type">{{ message.text }}</span>
            <span v-else-if="dirty" class="cms-pill warn">{{ $t('adminUnsaved') }}</span>
            <span v-else-if="draft && !isDefault" class="cms-pill">{{ $t('adminAllSaved') }}</span>
            <button v-if="dirty" class="cms-btn ghost" @click="discard">{{ $t('adminDiscard') }}</button>
            <button class="cms-btn primary" :disabled="!draft || saving || (!dirty && !isDefault)" @click="save">
              <font-awesome-icon icon="floppy-disk" /> {{ saving ? $t('adminSaving') : $t('adminSave') }}
            </button>
          </div>
          <span v-else-if="message" class="cms-message" :class="message.type">{{ message.text }}</span>
        </header>

        <div v-if="!draft" class="cms-center">{{ loadError || $t('adminLoading') }}</div>

        <div v-else class="cms-body">
          <p v-if="isDefault && !readOnlyTab" class="cms-note">
            <font-awesome-icon icon="circle-info" /> {{ $t('adminFallbackNote') }}
          </p>

        <!-- Projects -->
        <section v-if="tab === 'projects'" class="cms-projects">
          <div class="cms-list-col">
            <div class="cms-toolbar">
              <button class="cms-btn primary" @click="addProject">
                <font-awesome-icon icon="plus" /> {{ $t('adminNewProject') }}
              </button>
              <span class="cms-hint">{{ $t('adminDragHint') }}</span>
            </div>
            <ul class="cms-list">
              <li
                v-for="(p, i) in draft.projects"
                :key="p.id"
                class="cms-row"
                :class="{ active: editingId === p.id, hidden: p.hidden, dragging: isDragging(draft.projects, i) }"
                draggable="true"
                @dragstart="dragStart(draft.projects, i, $event)"
                @dragover.prevent="dragOver(draft.projects, i)"
                @dragend="dragEnd"
                @drop.prevent="dragEnd"
              >
                <font-awesome-icon icon="grip-vertical" class="cms-grip" />
                <img v-if="p.images.length" :src="resolveImage(p.images[0])" class="cms-row-thumb" alt="" />
                <span v-else class="cms-row-thumb empty"></span>
                <span class="cms-row-title">
                  {{ titleOf(p) }}
                  <small>{{ p.type }}<template v-if="p.status"> - {{ p.status }}</template></small>
                </span>
                <span v-if="p.hidden" class="cms-badge">{{ $t('adminHidden') }}</span>
                <span v-if="p.scrapped" class="cms-badge">{{ $t('adminScrappedBadge') }}</span>
                <div class="cms-row-buttons">
                  <button class="cms-icon-btn" :title="p.hidden ? $t('adminShow') : $t('adminHide')" @click="p.hidden = !p.hidden">
                    <font-awesome-icon :icon="p.hidden ? 'eye-slash' : 'eye'" />
                  </button>
                  <button class="cms-icon-btn" :title="$t('adminEdit')" @click="editingId = editingId === p.id ? null : p.id">
                    <font-awesome-icon icon="pen" />
                  </button>
                  <template v-if="confirmDeleteId === p.id">
                    <button class="cms-btn danger small" @click="removeProject(i)">{{ $t('adminYes') }}</button>
                    <button class="cms-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
                  </template>
                  <button v-else class="cms-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = p.id">
                    <font-awesome-icon icon="trash" />
                  </button>
                  <span class="cms-move">
                    <button class="cms-icon-btn" :disabled="i === 0" aria-label="Up" @click="move(draft.projects, i, -1)">&#9650;</button>
                    <button class="cms-icon-btn" :disabled="i === draft.projects.length - 1" aria-label="Down" @click="move(draft.projects, i, 1)">&#9660;</button>
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="editingProject" class="cms-edit-col">
            <div class="cms-edit-head">
              <h3>{{ titleOf(editingProject) }}</h3>
              <button class="cms-btn" @click="editingId = null">{{ $t('adminDone') }}</button>
            </div>

            <div class="cms-card">
              <h4 class="cms-card-title">{{ $t('adminSectionText') }}</h4>
              <LocalizedInput v-model="editingProject.title" :label="$t('adminTitle')" :defaults="textDefaults(editingProject.titleKey)" />
              <LocalizedInput
                v-model="editingProject.description"
                :label="$t('adminDescription')"
                :defaults="textDefaults(editingProject.descKey)"
                multiline
                :rows="6"
              />
            </div>

            <div class="cms-card">
              <h4 class="cms-card-title">{{ $t('adminSectionDetails') }}</h4>
              <div class="cms-grid2">
                <label class="cms-field">
                  <span>{{ $t('adminType') }}</span>
                  <input v-model="editingProject.type" class="cms-input" list="cms-types" />
                </label>
                <label class="cms-field">
                  <span>{{ $t('adminDate') }}</span>
                  <input v-model="editingProject.dateCreated" type="date" class="cms-input" />
                </label>
                <label class="cms-field">
                  <span>{{ $t('adminLink') }}</span>
                  <input v-model="editingProject.link" type="url" class="cms-input" placeholder="https://" />
                </label>
                <label class="cms-field">
                  <span>{{ $t('adminRepository') }}</span>
                  <input v-model="editingProject.repository" type="url" class="cms-input" placeholder="https://github.com/..." />
                </label>
                <label class="cms-field">
                  <span>{{ $t('adminStatus') }}</span>
                  <input v-model="editingProject.status" class="cms-input" list="cms-statuses" :placeholder="$t('adminStatusNone')" />
                </label>
              </div>
              <label class="cms-check">
                <input v-model="editingProject.disabled" type="checkbox" />
                <span>{{ $t('adminDisabled') }}</span>
              </label>
              <label class="cms-check">
                <input v-model="editingProject.scrapped" type="checkbox" />
                <span>{{ $t('adminScrapped') }}</span>
              </label>
            </div>
            <datalist id="cms-types">
              <option v-for="t in knownTypes" :key="t" :value="t" />
            </datalist>
            <datalist id="cms-statuses">
              <option v-for="s in knownStatuses" :key="s" :value="s" />
            </datalist>

            <div class="cms-card">
              <div class="cms-card-head">
                <h4 class="cms-card-title">{{ $t('adminPhotos') }}</h4>
                <label class="cms-btn small upload" :class="{ disabled: uploading }">
                  <font-awesome-icon icon="upload" /> {{ uploading ? $t('adminUploading') : $t('adminUpload') }}
                  <input type="file" accept="image/webp,image/jpeg,image/png,image/gif" multiple hidden :disabled="uploading" @change="uploadProjectImages" />
                </label>
              </div>
              <div class="cms-photos">
                <div
                  v-for="(img, i) in editingProject.images"
                  :key="img"
                  class="cms-photo"
                  :class="{ dragging: isDragging(editingProject.images, i) }"
                  draggable="true"
                  @dragstart="dragStart(editingProject.images, i, $event)"
                  @dragover.prevent="dragOver(editingProject.images, i)"
                  @dragend="dragEnd"
                  @drop.prevent="dragEnd"
                >
                  <img :src="resolveImage(img)" alt="" />
                  <span v-if="i === 0" class="cms-photo-badge">{{ $t('adminCover') }}</span>
                  <button class="cms-photo-remove" :title="$t('adminDelete')" @click="editingProject.images.splice(i, 1)">
                    <font-awesome-icon icon="xmark" />
                  </button>
                </div>
                <span v-if="!editingProject.images.length" class="cms-hint">{{ $t('adminNoPhotos') }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Art gallery -->
        <section v-else-if="tab === 'art'">
          <div class="cms-toolbar">
            <label class="cms-btn primary upload" :class="{ disabled: uploading }">
              <font-awesome-icon icon="upload" /> {{ uploading ? $t('adminUploading') : $t('adminUpload') }}
              <input type="file" accept="image/webp,image/jpeg,image/png,image/gif" multiple hidden :disabled="uploading" @change="uploadArt" />
            </label>
            <span class="cms-hint">{{ $t('adminDragHint') }}</span>
          </div>
          <div class="cms-art-grid">
            <div
              v-for="(a, i) in draft.art"
              :key="a.id"
              class="cms-art"
              :class="{ hidden: a.hidden, dragging: isDragging(draft.art, i) }"
              draggable="true"
              @dragstart="dragStart(draft.art, i, $event)"
              @dragover.prevent="dragOver(draft.art, i)"
              @dragend="dragEnd"
              @drop.prevent="dragEnd"
            >
              <img :src="resolveImage(a.src)" alt="" />
              <input v-model="a.name" class="cms-input" :aria-label="$t('adminPhotoName')" />
              <div class="cms-row-buttons">
                <button class="cms-icon-btn" :title="a.hidden ? $t('adminShow') : $t('adminHide')" @click="a.hidden = !a.hidden">
                  <font-awesome-icon :icon="a.hidden ? 'eye-slash' : 'eye'" />
                </button>
                <button class="cms-icon-btn" :disabled="i === 0" aria-label="Left" @click="move(draft.art, i, -1)">&#9664;</button>
                <button class="cms-icon-btn" :disabled="i === draft.art.length - 1" aria-label="Right" @click="move(draft.art, i, 1)">&#9654;</button>
                <template v-if="confirmDeleteId === a.id">
                  <button class="cms-btn danger small" @click="draft.art.splice(i, 1); confirmDeleteId = null">{{ $t('adminYes') }}</button>
                  <button class="cms-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
                </template>
                <button v-else class="cms-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = a.id">
                  <font-awesome-icon icon="trash" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Layout: default app placement on desktop + mobile -->
        <section v-else-if="tab === 'layout'" class="cms-layout">
          <div class="cms-layout-col">
            <h3>{{ $t('adminLayoutDesktop') }}</h3>
            <p class="cms-hint">{{ $t('adminLayoutDesktopHint') }}</p>
            <div class="cms-toolbar">
              <button class="cms-btn primary" :disabled="!canSnapshot" @click="useCurrentDesktop">
                {{ $t('adminLayoutUseCurrent') }}
              </button>
              <button v-if="fixedPositionCount" class="cms-btn" @click="clearDesktopPositions">
                {{ $t('adminLayoutClearPositions') }}
              </button>
            </div>
            <p class="cms-hint">
              <template v-if="!canSnapshot">{{ $t('adminLayoutNoDesktop') }}</template>
              <template v-else-if="fixedPositionCount">{{ $t('adminLayoutFixedCount', { n: fixedPositionCount }) }}</template>
              <template v-else>{{ $t('adminLayoutAutoGrid') }}</template>
            </p>
            <ul class="cms-list">
              <li
                v-for="(item, i) in draft.layout.desktop.items"
                :key="item.id"
                class="cms-row"
                :class="{ hidden: item.hidden, dragging: isDragging(draft.layout.desktop.items, i) }"
                draggable="true"
                @dragstart="dragStart(draft.layout.desktop.items, i, $event)"
                @dragover.prevent="dragOver(draft.layout.desktop.items, i)"
                @dragend="dragEnd"
                @drop.prevent="dragEnd"
              >
                <font-awesome-icon icon="grip-vertical" class="cms-grip" />
                <font-awesome-icon :icon="desktopMeta(item.id).icon" class="cms-layout-icon" />
                <span class="cms-row-title">{{ desktopMeta(item.id).label }}</span>
                <span v-if="item.hidden" class="cms-badge">{{ $t('adminHidden') }}</span>
                <div class="cms-row-buttons">
                  <button class="cms-icon-btn" :title="item.hidden ? $t('adminShow') : $t('adminHide')" @click="item.hidden = !item.hidden">
                    <font-awesome-icon :icon="item.hidden ? 'eye-slash' : 'eye'" />
                  </button>
                  <span class="cms-move">
                    <button class="cms-icon-btn" :disabled="i === 0" aria-label="Up" @click="move(draft.layout.desktop.items, i, -1)">&#9650;</button>
                    <button class="cms-icon-btn" :disabled="i === draft.layout.desktop.items.length - 1" aria-label="Down" @click="move(draft.layout.desktop.items, i, 1)">&#9660;</button>
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <div class="cms-layout-col">
            <h3>{{ $t('adminLayoutMobile') }}</h3>
            <p class="cms-hint">{{ $t('adminLayoutMobileHint') }}</p>
            <ul class="cms-list">
              <li
                v-for="(item, i) in draft.layout.mobile.items"
                :key="item.id"
                class="cms-row"
                :class="{ hidden: item.hidden, dragging: isDragging(draft.layout.mobile.items, i) }"
                draggable="true"
                @dragstart="dragStart(draft.layout.mobile.items, i, $event)"
                @dragover.prevent="dragOver(draft.layout.mobile.items, i)"
                @dragend="dragEnd"
                @drop.prevent="dragEnd"
              >
                <font-awesome-icon icon="grip-vertical" class="cms-grip" />
                <font-awesome-icon :icon="mobileMeta(item.id).icon" class="cms-layout-icon" />
                <span class="cms-row-title">
                  {{ mobileMeta(item.id).label }}
                  <small v-if="mobilePage(i) !== null">{{ $t('adminLayoutPage', { n: mobilePage(i) }) }}</small>
                </span>
                <span v-if="item.hidden" class="cms-badge">{{ $t('adminHidden') }}</span>
                <div class="cms-row-buttons">
                  <button class="cms-icon-btn" :title="item.hidden ? $t('adminShow') : $t('adminHide')" @click="item.hidden = !item.hidden">
                    <font-awesome-icon :icon="item.hidden ? 'eye-slash' : 'eye'" />
                  </button>
                  <span class="cms-move">
                    <button class="cms-icon-btn" :disabled="i === 0" aria-label="Up" @click="move(draft.layout.mobile.items, i, -1)">&#9650;</button>
                    <button class="cms-icon-btn" :disabled="i === draft.layout.mobile.items.length - 1" aria-label="Down" @click="move(draft.layout.mobile.items, i, 1)">&#9660;</button>
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <AdminAbout v-else-if="tab === 'about'" :draft="draft" @flash="flash" />
        <AdminDownloads v-else-if="tab === 'downloads'" :draft="draft" @flash="flash" />
        <AdminVinyl v-else-if="tab === 'vinyl'" :draft="draft" @flash="flash" />
        <AdminSkills v-else-if="tab === 'skills'" :draft="draft" />
        <AdminWallpapers v-else-if="tab === 'wallpapers'" :draft="draft" @flash="flash" />
        <AdminStats v-else-if="tab === 'stats'" />

        <!-- Texts -->
        <section v-else-if="tab === 'texts'" class="cms-texts">
          <div class="cms-toolbar">
            <input v-model="textSearch" class="cms-input grow" :placeholder="$t('adminTextsSearch')" />
            <label class="cms-check">
              <input v-model="onlyChangedTexts" type="checkbox" />
              <span>{{ $t('adminTextsOnlyChanged') }}</span>
            </label>
          </div>
          <p class="cms-hint">
            {{ $t('adminTextsHint', { example: '{name}', at: "{'@'}", open: "{'{'}", close: "{'}'}" }) }}
          </p>
          <div v-for="key in shownTextKeys" :key="key" class="cms-text-row" :class="{ changed: isTextChanged(key) }">
            <div class="cms-text-key">
              <code>{{ key }}</code>
              <template v-if="isTextChanged(key)">
                <span class="cms-badge">{{ $t('adminTextsChanged') }}</span>
                <button class="cms-btn small" @click="resetText(key)">{{ $t('adminReset') }}</button>
              </template>
            </div>
            <div class="cms-grid2">
              <textarea
                v-for="lang in langs"
                :key="lang"
                class="cms-input"
                :rows="textRows(key)"
                :value="textValue(lang, key)"
                :aria-label="`${key} (${lang})`"
                @input="setText(lang, key, $event.target.value)"
              ></textarea>
            </div>
          </div>
          <p v-if="filteredTextKeys.length > shownTextKeys.length" class="cms-hint">
            {{ shownTextKeys.length }} / {{ filteredTextKeys.length }}
          </p>
        </section>

        <!-- Scoreboards -->
        <section v-else-if="tab === 'scores'">
          <div class="cms-toolbar">
            <button
              v-for="g in GAMES"
              :key="g.key"
              class="cms-tab"
              :class="{ active: scoreGame === g.key }"
              @click="scoreGame = g.key"
            >
              {{ $t(g.labelKey) }}
            </button>
            <template v-if="scoreGame === 'minesweeper'">
              <button
                v-for="d in DIFFICULTIES"
                :key="d"
                class="cms-tab small"
                :class="{ active: scoreVariant === d }"
                @click="scoreVariant = d"
              >
                {{ $t('mine' + d.charAt(0).toUpperCase() + d.slice(1)) }}
              </button>
            </template>
            <button class="cms-btn" @click="loadScores">{{ $t('adminScoresRefresh') }}</button>
          </div>
          <div v-if="scoresLoading" class="cms-hint">{{ $t('adminLoading') }}</div>
          <div v-else-if="scoresError" class="cms-message error">{{ $t('adminScoresError') }}</div>
          <div v-else-if="!scores.length" class="cms-hint">{{ $t('adminScoresEmpty') }}</div>
          <table v-else class="cms-table">
            <tbody>
              <tr v-for="s in scores" :key="s.id">
                <td>{{ s.player_name }}</td>
                <td>{{ s.value }}<template v-if="s.metric === 'time_seconds'">s</template></td>
                <td>{{ formatDate(s.created_at) }}</td>
                <td class="cms-table-actions">
                  <template v-if="confirmDeleteId === s.id">
                    <button class="cms-btn danger small" @click="removeScore(s.id)">{{ $t('adminYes') }}</button>
                    <button class="cms-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
                  </template>
                  <button v-else class="cms-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = s.id">
                    <font-awesome-icon icon="trash" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        </div>
      </div>
    </div>
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
import { getDesktopCandidates, getDesktopNodes, getDesktopDefaultCells } from "../../filesystem";
import { appList, getMobileApps } from "../../windowConfig";
import { snapshotCells } from "../../desktopLayout";
import reorderMixin from "../admin/reorderMixin";
import AdminAbout from "../admin/AdminAbout.vue";
import LocalizedInput from "../admin/LocalizedInput.vue";
import AdminDownloads from "../admin/AdminDownloads.vue";
import AdminVinyl from "../admin/AdminVinyl.vue";
import AdminSkills from "../admin/AdminSkills.vue";
import AdminWallpapers from "../admin/AdminWallpapers.vue";
import AdminStats from "../admin/AdminStats.vue";

// Mirrors MobileHome.vue: the home screen shows this many apps per page.
const MOBILE_APPS_PER_PAGE = 6;

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
  components: { FontAwesomeIcon, LocalizedInput, AdminAbout, AdminDownloads, AdminVinyl, AdminSkills, AdminWallpapers, AdminStats },
  mixins: [reorderMixin],
  data() {
    return {
      admin: content.admin,
      GAMES,
      DIFFICULTIES,
      langs: ["en", "nl"],
      navGroups: [
        {
          labelKey: "adminNavContent",
          tabs: [
            { key: "projects", labelKey: "adminTabProjects", icon: "code" },
            { key: "art", labelKey: "adminTabArt", icon: "palette" },
            { key: "about", labelKey: "adminTabAbout", icon: "user" },
            { key: "downloads", labelKey: "adminTabDownloads", icon: "download" },
            { key: "vinyl", labelKey: "adminTabVinyl", icon: "compact-disc" },
            { key: "skills", labelKey: "adminTabSkills", icon: "sitemap" },
          ],
        },
        {
          labelKey: "adminNavSite",
          tabs: [
            { key: "layout", labelKey: "adminTabLayout", icon: "table-cells-large" },
            { key: "wallpapers", labelKey: "adminTabWallpapers", icon: "image" },
            { key: "texts", labelKey: "adminTabTexts", icon: "file-lines" },
          ],
        },
        {
          labelKey: "adminNavInsights",
          tabs: [
            { key: "stats", labelKey: "adminTabStats", icon: "chart-column" },
            { key: "scores", labelKey: "adminTabScores", icon: "ranking-star" },
          ],
        },
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
    currentTab() {
      for (const group of this.navGroups) {
        const found = group.tabs.find((t) => t.key === this.tab);
        if (found) return found;
      }
      return this.navGroups[0].tabs[0];
    },
    // Tabs that don't edit the saved content (no save button there).
    readOnlyTab() {
      return this.tab === "scores" || this.tab === "stats";
    },
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
    fixedPositionCount() {
      return Object.keys(this.draft?.layout?.desktop?.positions || {}).length;
    },
    canSnapshot() {
      // Depends on `tab` so it is re-checked each time the tab is opened.
      return this.tab === "layout" && snapshotCells() !== null;
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
      data.layout = this.normalizedLayout(data.layout);
      this.draft = data;
      this.savedSnapshot = JSON.stringify(data);
    },
    // Fill in the layout from what the site currently shows, and append any
    // app/folder the saved layout doesn't know about yet, so the editor always
    // lists everything.
    normalizedLayout(layout) {
      const out = layout && typeof layout === "object" && !Array.isArray(layout) ? layout : {};
      const candidates = getDesktopCandidates();
      const candidateIds = new Set(candidates.map((n) => n.id));
      if (!out.desktop || !Array.isArray(out.desktop.items)) {
        const current = getDesktopNodes();
        const visible = new Set(current.map((n) => n.id));
        const order = [...current, ...candidates.filter((n) => !visible.has(n.id))];
        out.desktop = { items: order.map((n) => ({ id: n.id, hidden: !visible.has(n.id) })), positions: getDesktopDefaultCells() };
      }
      const positions = out.desktop.positions;
      out.desktop.positions = positions && !Array.isArray(positions) ? { ...positions } : {};
      const knownDesktop = new Set(out.desktop.items.map((i) => i.id));
      for (const n of candidates) {
        if (!knownDesktop.has(n.id)) out.desktop.items.push({ id: n.id, hidden: !n.desktop });
      }
      out.desktop.items = out.desktop.items.filter((i) => candidateIds.has(i.id));

      const appNames = new Set(appList.map((a) => a.name));
      if (!out.mobile || !Array.isArray(out.mobile.items)) {
        const current = getMobileApps();
        const visible = new Set(current.map((a) => a.name));
        const order = [...current, ...appList.filter((a) => !visible.has(a.name))];
        out.mobile = { items: order.map((a) => ({ id: a.name, hidden: !visible.has(a.name) })) };
      }
      const knownMobile = new Set(out.mobile.items.map((i) => i.id));
      for (const a of appList) {
        if (!knownMobile.has(a.name)) out.mobile.items.push({ id: a.name, hidden: false });
      }
      out.mobile.items = out.mobile.items.filter((i) => appNames.has(i.id));
      return out;
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
    // Built-in { en, nl } text for an i18n key (including Texts-tab edits).
    textDefaults(key) {
      return { en: this.defaultTranslation("en", key), nl: this.defaultTranslation("nl", key) };
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


    // --- layout -----------------------------------------------------------
    desktopMeta(id) {
      const node = getDesktopCandidates().find((n) => n.id === id);
      return { icon: node?.icon || "folder", label: node ? node.name || this.$t(node.labelKey) : id };
    },
    mobileMeta(id) {
      const app = appList.find((a) => a.name === id);
      return { icon: app?.folder ? "folder" : app?.icon || "folder", label: app ? this.$t(app.labelKey) : id };
    },
    // Home-screen page number (1-based) an app lands on, or null when hidden.
    mobilePage(index) {
      const items = this.draft.layout.mobile.items;
      if (items[index].hidden) return null;
      const visibleBefore = items.slice(0, index).filter((i) => !i.hidden).length;
      return Math.floor(visibleBefore / MOBILE_APPS_PER_PAGE) + 1;
    },
    useCurrentDesktop() {
      const cells = snapshotCells();
      if (!cells) return;
      this.draft.layout.desktop.positions = cells;
      // Icons the admin currently sees on their own desktop become visible by
      // default; the rest stay as set in the list.
      const shown = new Set(Object.keys(cells));
      for (const item of this.draft.layout.desktop.items) {
        if (shown.has(item.id)) item.hidden = false;
      }
      this.flash("success", "adminLayoutCaptured");
    },
    clearDesktopPositions() {
      this.draft.layout.desktop.positions = {};
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

<style>
/* Not scoped: the tab components in src/components/admin/ share these styles.
   Every selector uses the cms- prefix, so nothing leaks into the rest of the site. */
.cms-window {
  --cms-bg: #13131b;
  --cms-panel: #191924;
  --cms-card: #1f1f2c;
  --cms-raised: #262636;
  --cms-border: #2c2c3e;
  --cms-border-strong: #3d3d55;
  --cms-text: #ecebf3;
  --cms-muted: #9993a8;
  --cms-faint: #6d6880;
  --cms-accent: #a43bc2;
  --cms-accent-hover: #b951d6;
  --cms-accent-soft: rgba(164, 59, 194, 0.16);
  --cms-danger: #d9475f;
  --cms-success: #5fcf8f;
  --cms-warn: #f2c464;
  --cms-radius: 8px;

  container-type: inline-size;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--cms-bg);
  color: var(--cms-text);
  /* Same font as the rest of the site. */
  font-family: "PortfolioFont", sans-serif;
  font-size: 14px;
  line-height: 1.45;
  letter-spacing: normal;
}
.cms-window *,
.cms-window *::before,
.cms-window *::after {
  box-sizing: border-box;
}
.cms-window h2,
.cms-window h3,
.cms-window h4 {
  font-family: inherit;
  margin: 0;
  font-weight: 650;
}

.cms-center {
  margin: auto;
  padding: 24px;
  color: var(--cms-muted);
  text-align: center;
}

/* ---------------------------------------------------------------- Login */
.cms-login {
  width: min(340px, 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px;
  border: 1px solid var(--cms-border);
  border-radius: 14px;
  background: var(--cms-panel);
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}
.cms-login h2 {
  font-size: 20px;
  color: var(--cms-text);
}
.cms-login .cms-hint {
  margin: -6px 0 6px;
}
.cms-login-icon {
  align-self: center;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--cms-accent-soft);
  color: var(--cms-accent-hover);
  font-size: 20px;
}

/* ---------------------------------------------------------------- Shell */
.cms-shell {
  flex: 1;
  min-height: 0;
  display: flex;
}
.cms-sidebar {
  /* Wide enough for the site's (wide) pixel font. */
  width: 228px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 10px;
  background: var(--cms-panel);
  border-right: 1px solid var(--cms-border);
  overflow-y: auto;
}
.cms-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 12px;
  font-weight: 700;
  font-size: 15px;
  color: var(--cms-text);
}
.cms-brand svg {
  color: var(--cms-accent-hover);
}
.cms-nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
}
.cms-nav-title {
  padding: 6px 10px 4px;
  font-size: 11px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--cms-faint);
}
.cms-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--cms-muted);
  font: inherit;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
}
.cms-nav-item span {
  overflow: hidden;
  text-overflow: ellipsis;
}
.cms-nav-item:hover {
  background: var(--cms-raised);
  color: var(--cms-text);
}
.cms-nav-item.active {
  background: var(--cms-accent-soft);
  color: var(--cms-text);
  box-shadow: inset 3px 0 0 var(--cms-accent);
}
.cms-nav-item.active svg {
  color: var(--cms-accent-hover);
}
.cms-logout {
  margin-top: auto;
}

.cms-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.cms-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--cms-border);
  background: var(--cms-bg);
}
.cms-topbar-text {
  min-width: 0;
}
.cms-topbar h2 {
  font-size: 18px;
}
.cms-topbar p {
  margin: 2px 0 0;
  color: var(--cms-muted);
  font-size: 13px;
}
.cms-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.cms-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 18px 22px 28px;
}

/* ---------------------------------------------------------------- Buttons */
.cms-btn,
.cms-tab,
.cms-icon-btn {
  font: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: var(--cms-radius);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.cms-btn {
  padding: 7px 14px;
  border: 1px solid var(--cms-border-strong);
  background: var(--cms-raised);
  color: var(--cms-text);
  font-weight: 550;
}
.cms-btn:hover {
  border-color: var(--cms-faint);
  background: #2e2e41;
}
.cms-btn.primary {
  background: var(--cms-accent);
  border-color: var(--cms-accent);
  color: #fff;
}
.cms-btn.primary:hover {
  background: var(--cms-accent-hover);
  border-color: var(--cms-accent-hover);
}
.cms-btn.ghost {
  background: transparent;
  border-color: transparent;
  color: var(--cms-muted);
}
.cms-btn.ghost:hover {
  color: var(--cms-text);
  background: var(--cms-raised);
}
.cms-btn.danger {
  background: var(--cms-danger);
  border-color: var(--cms-danger);
  color: #fff;
}
.cms-btn.small {
  padding: 4px 10px;
  font-size: 12.5px;
}
.cms-btn.block {
  width: 100%;
  padding: 10px 14px;
}
.cms-btn.upload {
  position: relative;
}
.cms-tab {
  padding: 6px 12px;
  border: 1px solid var(--cms-border);
  background: transparent;
  color: var(--cms-muted);
}
.cms-tab:hover {
  color: var(--cms-text);
  background: var(--cms-raised);
}
.cms-tab.active {
  background: var(--cms-accent-soft);
  border-color: var(--cms-accent);
  color: var(--cms-text);
}
.cms-tab.small {
  padding: 3px 9px;
  font-size: 12.5px;
}
.cms-icon-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--cms-muted);
}
.cms-icon-btn:hover {
  background: var(--cms-raised);
  border-color: var(--cms-border);
  color: var(--cms-text);
}
.cms-icon-btn.danger:hover {
  background: rgba(217, 71, 95, 0.15);
  border-color: rgba(217, 71, 95, 0.4);
  color: #ff8a9c;
}
.cms-btn:disabled,
.cms-icon-btn:disabled,
.cms-btn.disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}
.cms-link-btn {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  color: var(--cms-accent-hover);
  cursor: pointer;
}
.cms-link-btn:hover {
  text-decoration: underline;
}
.cms-window :focus-visible {
  outline: 2px solid var(--cms-accent-hover);
  outline-offset: 2px;
}

/* Arrow buttons are the touch fallback for drag & drop: hide them where a
   mouse can drag. */
@media (hover: hover) and (pointer: fine) {
  .cms-move,
  .cms-icon-btn[aria-label="Up"],
  .cms-icon-btn[aria-label="Down"],
  .cms-icon-btn[aria-label="Left"],
  .cms-icon-btn[aria-label="Right"] {
    display: none;
  }
}
.cms-move {
  display: inline-flex;
  flex-direction: column;
}
.cms-move .cms-icon-btn {
  width: 24px;
  height: 15px;
  font-size: 9px;
}

/* ---------------------------------------------------------------- Status */
/* Save status next to the Save button: a colored dot + short label. */
.cms-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border: 1px solid var(--cms-border);
  border-radius: 999px;
  background: var(--cms-card);
  color: var(--cms-muted);
  font-size: 12px;
  font-weight: normal;
  line-height: 1;
  white-space: nowrap;
}
.cms-pill::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cms-success);
  flex-shrink: 0;
}
.cms-pill.warn {
  border-color: rgba(242, 196, 100, 0.45);
  background: rgba(242, 196, 100, 0.08);
  color: var(--cms-warn);
}
.cms-pill.warn::before {
  background: var(--cms-warn);
  box-shadow: 0 0 0 3px rgba(242, 196, 100, 0.18);
}
.cms-message {
  font-size: 13px;
  white-space: nowrap;
}
.cms-message.error {
  color: #ff8a9c;
}
.cms-message.success {
  color: var(--cms-success);
}
.cms-hint {
  color: var(--cms-muted);
  font-size: 12.5px;
}
p.cms-hint {
  margin: 0 0 10px;
}
.cms-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 16px;
  padding: 10px 14px;
  border: 1px solid rgba(164, 59, 194, 0.35);
  border-radius: var(--cms-radius);
  background: var(--cms-accent-soft);
  color: #ddd3e8;
  font-size: 13px;
}
.cms-note svg {
  margin-top: 3px;
  color: var(--cms-accent-hover);
}
.cms-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--cms-raised);
  color: var(--cms-muted);
  white-space: nowrap;
}

/* ---------------------------------------------------------------- Forms */
.cms-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--cms-border-strong);
  border-radius: var(--cms-radius);
  background: var(--cms-bg);
  color: var(--cms-text);
  font: inherit;
  resize: vertical;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.cms-input:hover {
  border-color: var(--cms-faint);
}
.cms-input:focus {
  outline: none;
  border-color: var(--cms-accent);
  box-shadow: 0 0 0 3px var(--cms-accent-soft);
}
.cms-input::placeholder {
  color: var(--cms-faint);
}
.cms-input:disabled {
  opacity: 0.5;
}
.cms-input.grow {
  flex: 1;
  min-width: 160px;
  width: auto;
}
.cms-input.mono {
  font-family: inherit;
  font-size: 12px;
}
select.cms-input {
  resize: none;
  cursor: pointer;
}
input[type="date"].cms-input {
  color-scheme: dark;
}
.cms-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 550;
  color: var(--cms-muted);
}
.cms-field.grow {
  flex: 1;
  min-width: 0;
}
.cms-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 13.5px;
  color: var(--cms-text);
  cursor: pointer;
}
.cms-check input {
  width: 16px;
  height: 16px;
  accent-color: var(--cms-accent);
}
.cms-grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.cms-grid2.grow {
  flex: 1;
  min-width: 0;
}
.cms-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

/* Localized (EN / NL) field */
.cms-loc {
  margin-bottom: 14px;
}
.cms-loc.grow {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}
.cms-loc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}
.cms-loc-label {
  font-size: 12.5px;
  font-weight: 550;
  color: var(--cms-muted);
}
.cms-loc-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.cms-loc-field,
.cms-inline-lang {
  position: relative;
  display: block;
}
.cms-loc-field .cms-input,
.cms-inline-lang .cms-input {
  padding-left: 40px;
}
.cms-lang {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--cms-raised);
  color: var(--cms-muted);
  font-size: 10.5px;
  font-weight: 700;
  pointer-events: none;
}

/* Cards */
.cms-card {
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid var(--cms-border);
  border-radius: 10px;
  background: var(--cms-card);
}
.cms-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.cms-card-head .cms-card-title {
  margin: 0;
}
.cms-card-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 650;
  color: var(--cms-text);
}
h4.cms-card-title {
  margin-bottom: 12px;
}

/* ---------------------------------------------------------------- Lists */
.cms-projects {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.cms-projects:has(.cms-edit-col) {
  grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.3fr);
}
.cms-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cms-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--cms-border);
  border-radius: var(--cms-radius);
  background: var(--cms-card);
  cursor: grab;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.cms-row:hover {
  border-color: var(--cms-border-strong);
  background: #232332;
}
.cms-row.active {
  border-color: var(--cms-accent);
  background: var(--cms-accent-soft);
}
.cms-row.hidden .cms-row-title,
.cms-row.hidden .cms-row-thumb,
.cms-art.hidden img,
.cms-art.hidden .cms-wp-previews {
  opacity: 0.45;
}
.cms-row.dragging,
.cms-art.dragging,
.cms-photo.dragging,
.cms-question.dragging > .cms-row {
  outline: 2px dashed var(--cms-accent);
  outline-offset: 2px;
}
.cms-grip {
  color: var(--cms-faint);
  flex-shrink: 0;
}
.cms-row-thumb {
  width: 56px;
  height: 36px;
  object-fit: cover;
  border-radius: 5px;
  flex-shrink: 0;
}
.cms-row-thumb.square {
  width: 36px;
  height: 36px;
}
.cms-row-thumb.empty {
  background: var(--cms-raised);
}
.cms-row-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 550;
}
.cms-row-title small {
  display: block;
  margin-top: 1px;
  font-weight: 400;
  font-size: 12px;
  color: var(--cms-muted);
  overflow: hidden;
  text-overflow: ellipsis;
}
.cms-row-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.cms-edit-col {
  position: sticky;
  top: 0;
  align-self: start;
}
.cms-edit-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.cms-edit-head h3 {
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Photos */
.cms-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
.cms-photo {
  position: relative;
  aspect-ratio: 3 / 2;
  cursor: grab;
}
.cms-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--cms-border);
}
.cms-photo-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--cms-accent);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}
.cms-photo-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.cms-photo:hover .cms-photo-remove,
.cms-photo-remove:focus-visible {
  opacity: 1;
}
.cms-photo-remove:hover {
  background: var(--cms-danger);
}
@media (hover: none) {
  .cms-photo-remove {
    opacity: 1;
  }
}
.cms-thumb-preview {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--cms-border);
}
.cms-thumb-preview.round {
  border-radius: 50%;
}

/* Card grids (art, wallpapers, certificates) */
.cms-art-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}
.cms-art-grid.wide {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.cms-art {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--cms-border);
  border-radius: 10px;
  background: var(--cms-card);
  cursor: grab;
}
.cms-art:hover {
  border-color: var(--cms-border-strong);
}
.cms-art.is-default {
  border-color: var(--cms-accent);
}
.cms-art > img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 6px;
}
.cms-art .cms-loc {
  margin-bottom: 0;
}
.cms-art .cms-toolbar {
  margin-bottom: 0;
}
.cms-art .cms-check {
  margin-top: 0;
}

/* ---------------------------------------------------------------- Layout tab */
.cms-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
}
.cms-layout h3 {
  margin: 0 0 4px;
  font-size: 15px;
}
.cms-layout-icon {
  width: 20px;
  color: var(--cms-accent-hover);
  flex-shrink: 0;
}

/* ---------------------------------------------------------------- Texts tab */
.cms-text-row {
  padding: 12px 0;
  border-bottom: 1px solid var(--cms-border);
}
.cms-text-row.changed code {
  color: var(--cms-warn);
}
.cms-text-key {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.cms-text-key code {
  color: #d4a8e8;
  font-size: 12px;
  font-family: inherit;
}

/* ---------------------------------------------------------------- Scores */
.cms-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--cms-border);
  border-radius: var(--cms-radius);
  overflow: hidden;
}
.cms-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--cms-border);
}
.cms-table tr:nth-child(even) td {
  background: var(--cms-card);
}
.cms-table-actions {
  text-align: right;
  white-space: nowrap;
}

/* ---------------------------------------------------------------- About Me */
.cms-about {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cms-about-block {
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid var(--cms-border);
  border-radius: 10px;
  background: var(--cms-card);
}
.cms-about-block h3 {
  margin: 0 0 4px;
  font-size: 15px;
}
.cms-about-block .cms-row {
  background: var(--cms-bg);
}
.cms-question .cms-edit-col {
  position: static;
  margin: 6px 0 10px 22px;
  padding: 14px;
  border-left: 2px solid var(--cms-accent);
  background: var(--cms-bg);
  border-radius: 0 8px 8px 0;
}
.cms-question.hidden > .cms-row .cms-row-title {
  opacity: 0.45;
}
.cms-message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}
.cms-message-nr {
  width: 18px;
  padding-top: 9px;
  color: var(--cms-faint);
  text-align: right;
  flex-shrink: 0;
  font-weight: 600;
}
.cms-social-row {
  flex-wrap: wrap;
}
.cms-social-icon {
  width: 130px;
}
.cms-social-label {
  width: 140px;
}

/* ---------------------------------------------------------------- Vinyl */
.cms-vinyl {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.cms-vinyl h3 {
  margin: 0 0 4px;
  font-size: 15px;
}
.cms-vinyl .cms-art {
  margin-bottom: 10px;
}
.cms-vinyl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.cms-vinyl-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  font: inherit;
  color: var(--cms-text);
  text-align: left;
  background: var(--cms-card);
  border: 1px solid var(--cms-border);
  border-radius: 8px;
  cursor: pointer;
}
.cms-vinyl-item:hover {
  border-color: var(--cms-border-strong);
}
.cms-vinyl-item.hidden img,
.cms-vinyl-item.hidden .cms-vinyl-text {
  opacity: 0.35;
}
.cms-vinyl-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 5px;
}
.cms-vinyl-text {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  overflow: hidden;
}
.cms-vinyl-text strong,
.cms-vinyl-text small {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cms-vinyl-text small {
  color: var(--cms-muted);
}
.cms-vinyl-eye {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
}

/* ---------------------------------------------------------------- Skill tree */
.cms-skill-canvas-wrap {
  border: 1px solid var(--cms-border);
  border-radius: 10px;
  background:
    linear-gradient(var(--cms-border) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(90deg, var(--cms-border) 1px, transparent 1px) 0 0 / 40px 40px,
    var(--cms-panel);
  background-blend-mode: normal;
  margin-bottom: 16px;
  touch-action: none;
}
.cms-skill-canvas {
  display: block;
  width: 100%;
  height: auto;
  max-height: 440px;
}
.cms-skill-node {
  cursor: grab;
}
.cms-skill-label {
  fill: var(--cms-text);
  font-size: 15px;
  font-family: "PortfolioFont", sans-serif;
  pointer-events: none;
}
.cms-skills .cms-edit-col {
  position: static;
  padding: 16px;
  border: 1px solid var(--cms-border);
  border-radius: 10px;
  background: var(--cms-card);
}
.cms-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cms-chip {
  margin-top: 0;
  padding: 4px 10px;
  border: 1px solid var(--cms-border-strong);
  border-radius: 999px;
  font-size: 12.5px;
}
.cms-chip:has(input:checked) {
  border-color: var(--cms-accent);
  background: var(--cms-accent-soft);
}
.cms-category-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.cms-category-row .cms-inline-lang {
  flex: 1;
  min-width: 0;
}
.cms-color {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--cms-border-strong);
  border-radius: 8px;
  background: none;
  cursor: pointer;
  flex-shrink: 0;
}

/* ---------------------------------------------------------------- Wallpapers */
.cms-wp-previews {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.cms-wp-preview {
  aspect-ratio: 16 / 10;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--cms-border);
}

/* ---------------------------------------------------------------- Statistics */
.cms-stat-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.cms-stat-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  border: 1px solid var(--cms-border);
  border-radius: 10px;
  background: var(--cms-card);
}
.cms-stat-value {
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.cms-stat-label {
  font-size: 12.5px;
  color: var(--cms-muted);
}
.cms-stats h4 {
  margin: 0 0 10px;
  font-size: 13px;
}
.cms-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 170px;
  padding: 10px;
  border: 1px solid var(--cms-border);
  border-radius: 10px;
  background: var(--cms-card);
}
.cms-chart-bar {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
}
.cms-chart-fill {
  width: 100%;
  background: var(--cms-accent);
  border-radius: 3px 3px 0 0;
}
.cms-chart-bar:hover .cms-chart-fill {
  background: var(--cms-accent-hover);
}
.cms-chart-axis {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--cms-muted);
  margin: 6px 0 20px;
}
.cms-top-apps {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cms-top-apps li {
  display: grid;
  grid-template-columns: 160px 1fr 48px;
  align-items: center;
  gap: 10px;
}
.cms-top-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cms-top-bar {
  height: 10px;
  border-radius: 5px;
  background: var(--cms-raised);
  overflow: hidden;
}
.cms-top-bar span {
  display: block;
  height: 100%;
  border-radius: 5px;
  background: var(--cms-accent);
}
.cms-top-count {
  text-align: right;
  color: var(--cms-muted);
  font-variant-numeric: tabular-nums;
}

/* ---------------------------------------------------------------- Narrow windows
   Container queries: the admin panel lives in a resizable window, so react to
   the window's width rather than the viewport's. */
@container (max-width: 900px) {
  .cms-projects:has(.cms-edit-col),
  .cms-layout,
  .cms-vinyl {
    grid-template-columns: minmax(0, 1fr);
  }
  .cms-edit-col {
    position: static;
  }
}
@container (max-width: 700px) {
  .cms-shell {
    flex-direction: column;
  }
  .cms-sidebar {
    width: auto;
    flex-direction: row;
    align-items: center;
    gap: 2px;
    padding: 6px;
    border-right: none;
    border-bottom: 1px solid var(--cms-border);
    overflow-x: auto;
    overflow-y: hidden;
  }
  .cms-brand,
  .cms-nav-title {
    display: none;
  }
  .cms-nav-group {
    flex-direction: row;
    margin: 0;
  }
  .cms-nav-item {
    width: auto;
    padding: 7px 10px;
  }
  .cms-nav-item.active {
    box-shadow: inset 0 -2px 0 var(--cms-accent);
  }
  .cms-logout {
    margin: 0 0 0 auto;
  }
  .cms-topbar {
    flex-wrap: wrap;
    padding: 12px 14px;
  }
  .cms-topbar p {
    display: none;
  }
  .cms-body {
    padding: 14px;
  }
  .cms-grid2,
  .cms-loc-fields {
    grid-template-columns: minmax(0, 1fr);
  }
  .cms-top-apps li {
    grid-template-columns: 110px 1fr 40px;
  }
}
</style>
