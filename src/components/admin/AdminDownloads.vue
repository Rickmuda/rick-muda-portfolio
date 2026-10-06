<template>
  <section class="cms-projects">
    <div class="cms-list-col">
      <div class="cms-toolbar">
        <button class="cms-btn primary" @click="addDownload">
          <font-awesome-icon icon="plus" /> {{ $t('adminDlNew') }}
        </button>
        <span class="cms-hint">{{ $t('adminDragHint') }}</span>
      </div>
      <ul class="cms-list">
        <li
          v-for="(d, i) in draft.downloads"
          :key="d.id"
          class="cms-row"
          :class="{ active: editingId === d.id, hidden: d.hidden, dragging: isDragging(draft.downloads, i) }"
          draggable="true"
          @dragstart="dragStart(draft.downloads, i, $event)"
          @dragover.prevent="dragOver(draft.downloads, i)"
          @dragend="dragEnd"
          @drop.prevent="dragEnd"
        >
          <font-awesome-icon icon="grip-vertical" class="cms-grip" />
          <img v-if="d.thumbnail" :src="resolveImage(d.thumbnail)" class="cms-row-thumb square" alt="" />
          <span v-else class="cms-row-thumb square empty"></span>
          <span class="cms-row-title">
            {{ titleOf(d) }}
            <small>{{ $t(d.mode === 'gated' ? 'adminDlModeGated' : 'adminDlModePassword') }} - {{ $t('adminDlDevices_' + d.devices) }}</small>
          </span>
          <span v-if="d.hidden" class="cms-badge">{{ $t('adminHidden') }}</span>
          <span v-else-if="!d.available" class="cms-badge">{{ $t('comingSoon') }}</span>
          <div class="cms-row-buttons">
            <button class="cms-icon-btn" :title="d.hidden ? $t('adminShow') : $t('adminHide')" @click="d.hidden = !d.hidden">
              <font-awesome-icon :icon="d.hidden ? 'eye-slash' : 'eye'" />
            </button>
            <button class="cms-icon-btn" :title="$t('adminEdit')" @click="editingId = editingId === d.id ? null : d.id">
              <font-awesome-icon icon="pen" />
            </button>
            <template v-if="confirmDeleteId === d.id">
              <button class="cms-btn danger small" :title="$t('adminDlDeleteHint')" @click="removeDownload(i)">{{ $t('adminYes') }}</button>
              <button class="cms-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
            </template>
            <button v-else class="cms-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = d.id">
              <font-awesome-icon icon="trash" />
            </button>
            <span class="cms-move">
              <button class="cms-icon-btn" :disabled="i === 0" aria-label="Up" @click="move(draft.downloads, i, -1)">&#9650;</button>
              <button class="cms-icon-btn" :disabled="i === draft.downloads.length - 1" aria-label="Down" @click="move(draft.downloads, i, 1)">&#9660;</button>
            </span>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="editing" class="cms-edit-col">
      <div class="cms-edit-head">
        <h3>{{ titleOf(editing) }}</h3>
        <button class="cms-btn" @click="editingId = null">{{ $t('adminDone') }}</button>
      </div>

      <div class="cms-card">
        <h4 class="cms-card-title">{{ $t('adminSectionText') }}</h4>
        <LocalizedInput v-model="editing.title" :label="$t('adminTitle')" :defaults="textDefaults(editing.titleKey)" />
        <LocalizedInput v-model="editing.description" :label="$t('adminDescription')" :defaults="textDefaults(editing.descKey)" multiline :rows="4" />
      </div>

      <div class="cms-card">
      <h4 class="cms-card-title">{{ $t('adminSectionDetails') }}</h4>
      <div class="cms-grid2">
        <label class="cms-field">
          <span>{{ $t('adminDlVersion') }}</span>
          <input v-model="editing.version" class="cms-input" placeholder="v1.0" :disabled="editing.autoVersion" />
        </label>
        <label class="cms-field">
          <span>{{ $t('adminDlSize') }}</span>
          <input v-model="editing.size" class="cms-input" placeholder="12.3 MB" :disabled="editing.autoVersion" />
        </label>
        <label class="cms-field">
          <span>{{ $t('adminDlMode') }}</span>
          <select v-model="editing.mode" class="cms-input">
            <option value="password">{{ $t('adminDlModePassword') }}</option>
            <option value="gated">{{ $t('adminDlModeGated') }}</option>
          </select>
        </label>
        <label class="cms-field">
          <span>{{ $t('adminDlDevices') }}</span>
          <select v-model="editing.devices" class="cms-input">
            <option value="all">{{ $t('adminDlDevices_all') }}</option>
            <option value="desktop">{{ $t('adminDlDevices_desktop') }}</option>
            <option value="mobile">{{ $t('adminDlDevices_mobile') }}</option>
          </select>
        </label>
      </div>
      <label class="cms-check">
        <input v-model="editing.available" type="checkbox" />
        <span>{{ $t('adminDlAvailable') }}</span>
      </label>
      <label class="cms-check">
        <input v-model="editing.autoVersion" type="checkbox" />
        <span>{{ $t('adminDlAutoVersion') }}</span>
      </label>
      </div>

      <div class="cms-card">
      <h4 class="cms-card-title">{{ $t('adminDlThumbnail') }}</h4>
      <div class="cms-toolbar">
        <img v-if="editing.thumbnail" :src="resolveImage(editing.thumbnail)" class="cms-thumb-preview" alt="" />
        <label class="cms-btn upload" :class="{ disabled: uploading }">
          <font-awesome-icon icon="upload" /> {{ uploading ? $t('adminUploading') : $t('adminUpload') }}
          <input type="file" accept="image/webp,image/jpeg,image/png,image/gif" hidden :disabled="uploading" @change="uploadThumbnail" />
        </label>
      </div>
      </div>

      <div class="cms-card">
      <h4 class="cms-card-title">{{ $t('adminDlFile') }}</h4>
      <p class="cms-hint">
        <template v-if="files[editing.id]">
          {{ $t('adminDlFileCurrent', { name: files[editing.id].name, size: formatBytes(files[editing.id].size) }) }}
        </template>
        <template v-else>{{ $t('adminDlFileNone') }}</template>
      </p>
      <div class="cms-toolbar">
        <label class="cms-btn upload" :class="{ disabled: fileProgress !== null }">
          <font-awesome-icon icon="upload" />
          {{ fileProgress !== null ? $t('adminDlUploadingFile', { pct: Math.round(fileProgress * 100) }) : $t('adminDlUploadFile') }}
          <input type="file" hidden :disabled="fileProgress !== null" @change="uploadFile" />
        </label>
        <template v-if="files[editing.id]">
          <template v-if="confirmFileDelete">
            <button class="cms-btn danger small" @click="removeFile">{{ $t('adminYes') }}</button>
            <button class="cms-btn small" @click="confirmFileDelete = false">{{ $t('adminCancel') }}</button>
          </template>
          <button v-else class="cms-btn" @click="confirmFileDelete = true">{{ $t('adminDlDeleteFile') }}</button>
        </template>
      </div>

      </div>

      <div v-if="editing.mode === 'password'" class="cms-card">
        <h4 class="cms-card-title">{{ $t('adminDlPassword') }}</h4>
        <p class="cms-hint">{{ passwords[editing.id] ? $t('adminDlPasswordSet') : $t('adminDlPasswordNone') }}</p>
        <form class="cms-toolbar" @submit.prevent="savePassword">
          <input v-model="newPassword" type="text" class="cms-input grow" autocomplete="off" :placeholder="$t('adminDlPasswordNew')" />
          <button type="submit" class="cms-btn primary" :disabled="newPassword.length < 4">{{ $t('adminDlPasswordSave') }}</button>
          <button v-if="passwords[editing.id]" type="button" class="cms-btn" @click="clearPassword">{{ $t('adminDlPasswordClear') }}</button>
        </form>
      </div>
      <p class="cms-hint">{{ $t('adminDlSaveHint') }}</p>
    </div>
  </section>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  resolveImage,
  itemText,
  defaultText,
  uploadImage,
  fetchDownloadFiles,
  uploadDownloadFile,
  setDownloadPassword,
  deleteDownloadFile,
} from "../../contentStore";
import LocalizedInput from "./LocalizedInput.vue";
import reorderMixin from "./reorderMixin";

export default {
  name: "AdminDownloads",
  components: { FontAwesomeIcon, LocalizedInput },
  mixins: [reorderMixin],
  props: {
    // The admin panel's whole editable content; this tab edits draft.downloads.
    draft: { type: Object, required: true },
  },
  emits: ["flash"],
  data() {
    return {
      langs: ["en", "nl"],
      editingId: null,
      confirmDeleteId: null,
      confirmFileDelete: false,
      uploading: false,
      fileProgress: null,
      files: {},
      passwords: {},
      newPassword: "",
    };
  },
  computed: {
    editing() {
      return this.draft.downloads.find((d) => d.id === this.editingId) || null;
    },
  },
  watch: {
    editingId() {
      this.newPassword = "";
      this.confirmFileDelete = false;
    },
  },
  mounted() {
    this.loadFiles();
  },
  methods: {
    resolveImage,
    async loadFiles() {
      const res = await fetchDownloadFiles();
      if (res) {
        this.files = res.files;
        this.passwords = res.passwords;
      }
    },
    titleOf(d) {
      return itemText(d.title, d.titleKey, d.id);
    },
    textDefaults(key) {
      return { en: this.defaultTranslation("en", key), nl: this.defaultTranslation("nl", key) };
    },
    defaultTranslation(lang, key) {
      if (!key) return "";
      return this.draft.texts?.[lang]?.[key] ?? defaultText(lang, key) ?? "";
    },
    formatBytes(bytes) {
      if (!bytes) return "";
      const units = ["B", "KB", "MB", "GB"];
      let value = bytes;
      let i = 0;
      while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
      }
      return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
    },
    addDownload() {
      const download = {
        id: "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: { en: this.$t("adminDlNew") },
        description: {},
        thumbnail: "",
        version: "v1.0",
        size: "",
        mode: "password",
        devices: "all",
        available: false,
        autoVersion: false,
        hidden: true, // stays invisible until you choose to show it
      };
      this.draft.downloads.unshift(download);
      this.editingId = download.id;
    },
    // Also removes its uploaded file + password from the server right away.
    async removeDownload(i) {
      const [removed] = this.draft.downloads.splice(i, 1);
      this.confirmDeleteId = null;
      if (!removed) return;
      if (removed.id === this.editingId) this.editingId = null;
      if (this.files[removed.id] || this.passwords[removed.id]) {
        await deleteDownloadFile(removed.id);
        this.loadFiles();
      }
    },
    async uploadThumbnail(e) {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file || !this.editing) return;
      const target = this.editing;
      this.uploading = true;
      const url = await uploadImage(file, "downloads");
      this.uploading = false;
      if (url) target.thumbnail = url;
      else this.$emit("flash", "error", "adminUploadError");
    },
    async uploadFile(e) {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file || !this.editing) return;
      const target = this.editing;
      this.fileProgress = 0;
      const result = await uploadDownloadFile(target.id, file, (p) => (this.fileProgress = p));
      this.fileProgress = null;
      if (!result) {
        this.$emit("flash", "error", "adminDlUploadFileError");
        return;
      }
      if (!target.autoVersion) target.size = this.formatBytes(result.size);
      await this.loadFiles();
      this.$emit("flash", "success", "adminDlUploadFileDone");
    },
    async removeFile() {
      this.confirmFileDelete = false;
      if (!this.editing) return;
      await deleteDownloadFile(this.editing.id);
      await this.loadFiles();
    },
    async savePassword() {
      if (!this.editing || this.newPassword.length < 4) return;
      const ok = await setDownloadPassword(this.editing.id, this.newPassword);
      this.newPassword = "";
      if (ok) {
        await this.loadFiles();
        this.$emit("flash", "success", "adminDlPasswordSaved");
      } else {
        this.$emit("flash", "error", "adminSaveError");
      }
    },
    async clearPassword() {
      if (!this.editing) return;
      await setDownloadPassword(this.editing.id, "");
      await this.loadFiles();
    },
  },
};
</script>
