<template>
  <section class="cms-vinyl">
    <div class="cms-layout-col">
      <h3>{{ $t('adminVinylDiscogs') }}</h3>
      <p class="cms-hint">{{ $t('adminVinylDiscogsHint') }}</p>
      <div class="cms-toolbar">
        <input v-model="draft.vinyl.username" class="cms-input grow" :placeholder="$t('adminVinylUsername')" />
        <button class="cms-btn" :disabled="loading || !draft.vinyl.username" @click="loadCollection">
          {{ loading ? $t('adminLoading') : $t('adminVinylLoad') }}
        </button>
      </div>
      <p v-if="error" class="cms-message error">{{ error }}</p>
      <p v-else-if="albums.length" class="cms-hint">
        {{ $t('adminVinylCount', { shown: albums.length - hiddenCount, total: albums.length }) }}
      </p>
      <div class="cms-vinyl-grid">
        <button
          v-for="a in albums"
          :key="a.discogsId"
          type="button"
          class="cms-vinyl-item"
          :class="{ hidden: isHidden(a.discogsId) }"
          :title="isHidden(a.discogsId) ? $t('adminShow') : $t('adminHide')"
          @click="toggleHidden(a.discogsId)"
        >
          <img v-if="a.thumb" :src="a.thumb" alt="" loading="lazy" />
          <span class="cms-vinyl-text">
            <strong>{{ a.title }}</strong>
            <small>{{ a.artist }}</small>
          </span>
          <font-awesome-icon :icon="isHidden(a.discogsId) ? 'eye-slash' : 'eye'" class="cms-vinyl-eye" />
        </button>
      </div>
    </div>

    <div class="cms-layout-col">
      <h3>{{ $t('adminVinylExtra') }}</h3>
      <p class="cms-hint">{{ $t('adminVinylExtraHint') }}</p>
      <div class="cms-toolbar">
        <button class="cms-btn primary" @click="addAlbum">
          <font-awesome-icon icon="plus" /> {{ $t('adminVinylAdd') }}
        </button>
      </div>
      <div
        v-for="(a, i) in draft.vinyl.extra"
        :key="a.id"
        class="cms-art"
        :class="{ hidden: a.hidden, dragging: isDragging(draft.vinyl.extra, i) }"
        draggable="true"
        @dragstart="dragStart(draft.vinyl.extra, i, $event)"
        @dragover.prevent="dragOver(draft.vinyl.extra, i)"
        @dragend="dragEnd"
        @drop.prevent="dragEnd"
      >
        <div class="cms-toolbar">
          <img v-if="a.cover" :src="resolveImage(a.cover)" class="cms-thumb-preview" alt="" />
          <label class="cms-btn upload small" :class="{ disabled: uploadingId === a.id }">
            <font-awesome-icon icon="upload" /> {{ uploadingId === a.id ? $t('adminUploading') : $t('adminVinylCover') }}
            <input type="file" accept="image/webp,image/jpeg,image/png,image/gif" hidden @change="uploadCover(a, $event)" />
          </label>
        </div>
        <input v-model="a.title" class="cms-input" :placeholder="$t('adminTitle')" />
        <input v-model="a.artist" class="cms-input" :placeholder="$t('adminVinylArtist')" />
        <div class="cms-row-buttons">
          <button class="cms-icon-btn" :title="a.hidden ? $t('adminShow') : $t('adminHide')" @click="a.hidden = !a.hidden">
            <font-awesome-icon :icon="a.hidden ? 'eye-slash' : 'eye'" />
          </button>
          <button class="cms-icon-btn" :disabled="i === 0" aria-label="Up" @click="move(draft.vinyl.extra, i, -1)">&#9650;</button>
          <button class="cms-icon-btn" :disabled="i === draft.vinyl.extra.length - 1" aria-label="Down" @click="move(draft.vinyl.extra, i, 1)">&#9660;</button>
          <template v-if="confirmDeleteId === a.id">
            <button class="cms-btn danger small" @click="draft.vinyl.extra.splice(i, 1); confirmDeleteId = null">{{ $t('adminYes') }}</button>
            <button class="cms-btn small" @click="confirmDeleteId = null">{{ $t('adminCancel') }}</button>
          </template>
          <button v-else class="cms-icon-btn danger" :title="$t('adminDelete')" @click="confirmDeleteId = a.id">
            <font-awesome-icon icon="trash" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { resolveImage, uploadImage } from "../../contentStore";
import reorderMixin from "./reorderMixin";

export default {
  name: "AdminVinyl",
  components: { FontAwesomeIcon },
  mixins: [reorderMixin],
  props: {
    // The admin panel's whole editable content; this tab edits draft.vinyl.
    draft: { type: Object, required: true },
  },
  emits: ["flash"],
  data() {
    return {
      albums: [],
      loading: false,
      error: "",
      confirmDeleteId: null,
      uploadingId: null,
    };
  },
  computed: {
    hiddenSet() {
      return new Set(this.draft.vinyl.hidden.map(Number));
    },
    hiddenCount() {
      return this.albums.filter((a) => this.hiddenSet.has(a.discogsId)).length;
    },
  },
  mounted() {
    if (this.draft.vinyl.username) this.loadCollection();
  },
  methods: {
    resolveImage,
    isHidden(id) {
      return this.hiddenSet.has(id);
    },
    toggleHidden(id) {
      const list = this.draft.vinyl.hidden;
      const i = list.findIndex((h) => Number(h) === id);
      if (i >= 0) list.splice(i, 1);
      else list.push(id);
    },
    // Same Discogs API as VinylCollection.vue (public collection, no token).
    async loadCollection() {
      this.loading = true;
      this.error = "";
      const out = [];
      try {
        let page = 1;
        let pages = 1;
        do {
          const url = `https://api.discogs.com/users/${encodeURIComponent(this.draft.vinyl.username)}/collection/folders/0/releases?per_page=100&page=${page}&sort=added&sort_order=desc`;
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(this.$t("adminVinylLoadError", { status: res.status }));
          const data = await res.json();
          pages = data.pagination?.pages || 1;
          for (const r of data.releases || []) {
            const info = r.basic_information || {};
            out.push({
              discogsId: Number(info.id || r.id),
              title: info.title || "?",
              artist: (info.artists || []).map((a) => a.name.replace(/\s\(\d+\)$/, "")).join(", "),
              thumb: info.thumb || info.cover_image || null,
            });
          }
          page += 1;
        } while (page <= pages && page <= 5);
        this.albums = out;
      } catch (err) {
        this.error = err.message;
        this.albums = [];
      }
      this.loading = false;
    },
    addAlbum() {
      this.draft.vinyl.extra.unshift({
        id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: "",
        artist: "",
        cover: "",
        hidden: false,
      });
    },
    async uploadCover(album, e) {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      this.uploadingId = album.id;
      const url = await uploadImage(file, "vinyl");
      this.uploadingId = null;
      if (url) album.cover = url;
      else this.$emit("flash", "error", "adminUploadError");
    },
  },
};
</script>
