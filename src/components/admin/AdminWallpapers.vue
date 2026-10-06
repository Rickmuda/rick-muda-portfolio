<template>
  <section>
    <div class="cms-toolbar">
      <label class="cms-btn primary upload" :class="{ disabled: uploading }">
        <font-awesome-icon icon="upload" /> {{ uploading ? $t('adminUploading') : $t('adminWpUpload') }}
        <input type="file" accept="image/webp,image/jpeg,image/png" hidden :disabled="uploading" @change="addWallpaper" />
      </label>
      <span class="cms-hint">{{ $t('adminWpHint') }}</span>
    </div>

    <div class="cms-art-grid wide">
      <div
        v-for="(w, i) in wallpapers.items"
        :key="w.id"
        class="cms-art"
        :class="{ hidden: w.hidden, dragging: isDragging(wallpapers.items, i), 'is-default': wallpapers.defaultId === w.id }"
        draggable="true"
        @dragstart="dragStart(wallpapers.items, i, $event)"
        @dragover.prevent="dragOver(wallpapers.items, i)"
        @dragend="dragEnd"
        @drop.prevent="dragEnd"
      >
        <div class="cms-wp-previews">
          <div class="cms-wp-preview" :style="{ backgroundImage: preview(w, false) }" :title="$t('adminWpLight')"></div>
          <div class="cms-wp-preview" :style="{ backgroundImage: preview(w, true) }" :title="$t('adminWpDark')"></div>
        </div>

        <LocalizedInput v-model="w.label" :label="$t('adminWpName')" :defaults="labelDefaults(w)" />

        <template v-if="w.image">
          <div class="cms-toolbar">
            <label class="cms-btn upload small" :class="{ disabled: uploading }">
              <font-awesome-icon icon="upload" /> {{ $t('adminWpLight') }}
              <input type="file" accept="image/webp,image/jpeg,image/png" hidden @change="replaceImage(w, 'image', $event)" />
            </label>
            <label class="cms-btn upload small" :class="{ disabled: uploading }">
              <font-awesome-icon icon="upload" /> {{ $t('adminWpDark') }}
              <input type="file" accept="image/webp,image/jpeg,image/png" hidden @change="replaceImage(w, 'darkImage', $event)" />
            </label>
            <button v-if="w.darkImage" class="cms-btn small" @click="w.darkImage = ''">{{ $t('adminWpNoDark') }}</button>
          </div>
        </template>
        <template v-else>
          <input v-model="w.css" class="cms-input mono" :placeholder="$t('adminWpLight')" />
          <input v-model="w.darkCss" class="cms-input mono" :placeholder="$t('adminWpDark')" />
        </template>

        <label class="cms-check">
          <input type="radio" name="cms-wp-default" :checked="wallpapers.defaultId === w.id" @change="wallpapers.defaultId = w.id" />
          <span>{{ $t('adminWpDefault') }}</span>
        </label>

        <div class="cms-row-buttons">
          <button
            class="cms-icon-btn"
            :disabled="wallpapers.defaultId === w.id"
            :title="w.hidden ? $t('adminShow') : $t('adminHide')"
            @click="w.hidden = !w.hidden"
          >
            <font-awesome-icon :icon="w.hidden ? 'eye-slash' : 'eye'" />
          </button>
          <button class="cms-icon-btn" :disabled="i === 0" aria-label="Left" @click="move(wallpapers.items, i, -1)">&#9664;</button>
          <button class="cms-icon-btn" :disabled="i === wallpapers.items.length - 1" aria-label="Right" @click="move(wallpapers.items, i, 1)">&#9654;</button>
          <template v-if="confirmDeleteId === w.id">
            <button class="cms-btn danger small" @click="removeWallpaper(i)">{{ $t('adminYes') }}</button>
            <button class="cms-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
          </template>
          <button
            v-else
            class="cms-icon-btn danger"
            :disabled="wallpapers.defaultId === w.id"
            :title="$t('adminDelete')"
            @click="confirmDeleteId = w.id"
          >
            <font-awesome-icon icon="trash" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { resolveImage, uploadImage, defaultText } from "../../contentStore";
import LocalizedInput from "./LocalizedInput.vue";
import reorderMixin from "./reorderMixin";

export default {
  name: "AdminWallpapers",
  components: { FontAwesomeIcon, LocalizedInput },
  mixins: [reorderMixin],
  props: {
    // The admin panel's whole editable content; this tab edits draft.wallpapers.
    draft: { type: Object, required: true },
  },
  emits: ["flash"],
  data() {
    return {
      langs: ["en", "nl"],
      uploading: false,
      confirmDeleteId: null,
    };
  },
  computed: {
    wallpapers() {
      return this.draft.wallpapers;
    },
  },
  methods: {
    preview(w, dark) {
      const image = dark ? w.darkImage || w.image : w.image;
      if (image) return `url('${resolveImage(image)}')`;
      return (dark ? w.darkCss || w.css : w.css) || "none";
    },
    labelDefaults(w) {
      if (!w.labelKey) return {};
      const get = (lang) => this.draft.texts?.[lang]?.[w.labelKey] ?? defaultText(lang, w.labelKey) ?? "";
      return { en: get("en"), nl: get("nl") };
    },
    async upload(file) {
      this.uploading = true;
      const url = await uploadImage(file, "wallpapers");
      this.uploading = false;
      if (!url) this.$emit("flash", "error", "adminUploadError");
      return url;
    },
    async addWallpaper(e) {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const url = await this.upload(file);
      if (!url) return;
      this.wallpapers.items.push({
        id: "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        label: { en: file.name.replace(/\.[^.]+$/, "") },
        image: url,
        darkImage: "",
        css: "",
        darkCss: "",
        hidden: false,
      });
    },
    async replaceImage(w, field, e) {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const url = await this.upload(file);
      if (url) w[field] = url;
    },
    removeWallpaper(i) {
      this.wallpapers.items.splice(i, 1);
      this.confirmDeleteId = null;
    },
  },
};
</script>
