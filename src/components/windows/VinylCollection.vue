<template>
  <div class="wmp">
    <nav class="wmp-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="wmp-tab"
        :class="{
          active: activeTab === tab.id,
          disabled: tab.id === 'nowPlaying' && selectedIndex === null,
        }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="wmp-disclaimer">
      <span class="disclaimer-icon">&#9432;</span>
      <span>{{ $t('vinylDisclaimer') }}</span>
    </div>

    <div class="wmp-main">
      <div v-if="loading" class="state-screen">
        <div class="loading-spinner"></div>
        <p>Loading collection from Discogs…</p>
      </div>

      <div v-else-if="error" class="state-screen error">
        <p><strong>Couldn't reach Discogs.</strong></p>
        <p class="state-detail">{{ error }}</p>
        <button class="retry-button" @click="fetchCollection">Retry</button>
      </div>

      <div v-else-if="!albums.length" class="state-screen">
        <p>No albums found in this collection.</p>
      </div>

      <template v-else>
        <div v-if="activeTab === 'nowPlaying'" class="now-playing">
          <button
            class="np-hamburger"
            @click="showTracklist = !showTracklist"
            :aria-label="showTracklist ? 'Show cover' : 'Show tracklist'"
          >
            <span></span><span></span><span></span>
          </button>
          <div class="media-panel">
            <div v-if="!showTracklist" class="cover-frame">
              <img
                v-if="currentAlbum.cover"
                :src="currentAlbum.cover"
                :alt="currentAlbum.title"
                class="cover-image"
                loading="lazy"
                decoding="async"
              />
              <div v-else class="cover-fallback">♪</div>
              <div class="cover-glow"></div>
            </div>

            <div v-else class="tracklist-frame">
              <div class="tracklist-title">Tracklist</div>
              <div v-if="tracklistLoading" class="tracklist-state">Loading...</div>
              <div v-else-if="!currentTracklist.length" class="tracklist-state">
                No tracklist available
              </div>
              <ol v-else class="tracklist">
                <li v-for="(track, i) in currentTracklist" :key="i" class="tracklist-row">
                  <span class="track-pos">{{ track.position || (i + 1) }}</span>
                  <span class="track-title-cell">{{ track.title }}</span>
                  <span class="track-duration">{{ track.duration || '-:--' }}</span>
                </li>
              </ol>
            </div>
          </div>

          <div class="track-info">
            <div class="track-title">{{ currentAlbum.title }}</div>
            <div class="track-artist">{{ currentAlbum.artist }}</div>
            <button class="info-toggle" @click="showTracklist = !showTracklist">
              {{ showTracklist ? 'Show Cover' : 'Show Tracklist' }}
            </button>
          </div>
        </div>

        <div v-else-if="activeTab === 'library'" class="library">
          <div class="library-grid">
            <button
              v-for="(album, index) in albums"
              :key="album.id"
              class="library-tile"
              :class="{ active: selectedIndex === index }"
              @click="selectAlbum(index)"
              :title="album.title"
            >
              <div class="tile-cover">
                <img v-if="album.thumb" :src="album.thumb" :alt="album.title" loading="lazy" decoding="async" />
                <div v-else class="tile-fallback">♪</div>
              </div>
              <div class="tile-title">{{ album.title }}</div>
              <div class="tile-artist">{{ album.artist }}</div>
            </button>
          </div>
        </div>
      </template>
    </div>

    <footer class="wmp-controls" v-if="!loading && !error && albums.length && selectedIndex !== null">
      <div class="progress-row">
        <div class="progress-bar" @click="onSeek">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          <div class="progress-thumb" :style="{ left: progress + '%' }"></div>
        </div>
        <span class="time-readout">{{ formattedTime }}</span>
      </div>

      <div class="transport-row">
        <div class="transport-buttons">
          <button class="ctrl-btn" @click="prevAlbum" title="Previous">
            <svg viewBox="0 0 16 16"><path d="M4 3 v10 M4 8 L13 3 V13 Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>
          </button>
          <button class="ctrl-btn primary" @click="togglePlay" :title="isPlaying ? 'Pause' : 'Play'">
            <svg v-if="isPlaying" viewBox="0 0 16 16"><rect x="3" y="3" width="3.5" height="10" fill="currentColor"/><rect x="9.5" y="3" width="3.5" height="10" fill="currentColor"/></svg>
            <svg v-else viewBox="0 0 16 16"><path d="M4 3 L13 8 L4 13 Z" fill="currentColor"/></svg>
          </button>
          <button class="ctrl-btn" @click="nextAlbum" title="Next">
            <svg viewBox="0 0 16 16"><path d="M12 3 v10 M12 8 L3 3 V13 Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>
          </button>
        </div>

        <div class="volume-row">
          <span class="volume-icon">
            <svg viewBox="0 0 16 16"><path d="M2 6 H5 L9 3 V13 L5 10 H2 Z" fill="currentColor"/></svg>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            v-model.number="volume"
            class="volume-slider"
            aria-label="Volume"
          />
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
const DISCOGS_USERNAME = 'Rick_muda';
const TICK_MS = 500;

export default {
  data() {
    return {
      selectedIndex: null,
      isPlaying: false,
      albums: [],
      loading: true,
      error: null,
      activeTab: 'library',
      progress: 0,
      progressInterval: null,
      volume: 75,
      durations: {},
      tracklists: {},
      durationsFetching: {},
      showTracklist: false,
      tabs: [
        { id: 'nowPlaying', label: 'Now Playing' },
        { id: 'library', label: 'Library' },
      ],
    };
  },
  computed: {
    currentAlbum() {
      return this.albums[this.selectedIndex] || {};
    },
    currentDuration() {
      return this.durations[this.currentAlbum.discogsId] || 0;
    },
    currentTracklist() {
      if (!this.currentAlbum.discogsId) return [];
      return this.tracklists[this.currentAlbum.discogsId] || [];
    },
    tracklistLoading() {
      if (!this.currentAlbum.discogsId) return false;
      return !!this.durationsFetching[this.currentAlbum.discogsId];
    },
    elapsedSeconds() {
      if (!this.currentDuration) return 0;
      return (this.progress / 100) * this.currentDuration;
    },
    formattedTime() {
      if (!this.currentDuration) return '-:-- / -:--';
      return `${this.formatTime(this.elapsedSeconds)} / ${this.formatTime(this.currentDuration)}`;
    },
  },
  watch: {
    currentAlbum(newAlbum) {
      if (newAlbum && newAlbum.discogsId && this.durations[newAlbum.discogsId] === undefined) {
        this.fetchAlbumDuration(newAlbum.discogsId);
      }
    },
  },
  mounted() {
    this.fetchCollection();
  },
  beforeUnmount() {
    this.stopProgressTick();
  },
  methods: {
    async fetchCollection() {
      this.loading = true;
      this.error = null;
      this.albums = [];
      this.selectedIndex = null;
      this.activeTab = 'library';
      this.isPlaying = false;
      this.progress = 0;
      this.stopProgressTick();

      try {
        const collected = [];
        let page = 1;
        const perPage = 100;
        let totalPages = 1;

        do {
          const url = `https://api.discogs.com/users/${encodeURIComponent(DISCOGS_USERNAME)}/collection/folders/0/releases?per_page=${perPage}&page=${page}&sort=added&sort_order=desc`;
          const response = await fetch(url, { headers: { Accept: 'application/json' } });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('User or collection not found. Is the collection set to public?');
            }
            if (response.status === 401 || response.status === 403) {
              throw new Error('Collection is private. Set it to public on Discogs or use a token.');
            }
            throw new Error(`Discogs API returned ${response.status}.`);
          }

          const data = await response.json();
          totalPages = data.pagination?.pages || 1;
          collected.push(...data.releases.map(this.mapRelease));
          page += 1;
        } while (page <= totalPages && page <= 5);

        this.albums = collected;
      } catch (err) {
        this.error = err.message || 'Unknown error fetching collection.';
      } finally {
        this.loading = false;
      }
    },
    mapRelease(release) {
      const info = release.basic_information || {};
      const artist = (info.artists || []).map(a => a.name.replace(/\s\(\d+\)$/, '')).join(', ');
      return {
        id: release.instance_id || release.id,
        discogsId: info.id || release.id,
        title: info.title || 'Unknown title',
        artist: artist || 'Unknown artist',
        cover: info.cover_image || null,
        thumb: info.thumb || info.cover_image || null,
      };
    },
    async fetchAlbumDuration(releaseId) {
      if (this.durations[releaseId] !== undefined) return;
      if (this.durationsFetching[releaseId]) return;
      this.durationsFetching = { ...this.durationsFetching, [releaseId]: true };
      try {
        let tracks = [];
        let totalSeconds = 0;

        const url = `https://api.discogs.com/releases/${releaseId}`;
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (response.ok) {
          const data = await response.json();
          tracks = (data.tracklist || []).filter(t => !t.type_ || t.type_ === 'track');
          totalSeconds = tracks.reduce((sum, t) => sum + this.parseDuration(t.duration), 0);
        }

        if (totalSeconds === 0) {
          const album = this.albums.find(a => a.discogsId === releaseId);
          if (album && album.artist && album.title) {
            const mbTracks = await this.fetchFromMusicBrainz(album.artist, album.title);
            if (mbTracks && mbTracks.some(t => t._seconds > 0)) {
              tracks = mbTracks.map(t => ({
                position: t.position,
                title: t.title,
                duration: t.duration,
              }));
              totalSeconds = mbTracks.reduce((sum, t) => sum + (t._seconds || 0), 0);
            }
          }
        }

        this.durations = { ...this.durations, [releaseId]: totalSeconds };
        this.tracklists = { ...this.tracklists, [releaseId]: tracks };
      } catch (e) {
        this.durations = { ...this.durations, [releaseId]: 0 };
        this.tracklists = { ...this.tracklists, [releaseId]: [] };
      } finally {
        this.durationsFetching = { ...this.durationsFetching, [releaseId]: false };
      }
    },
    async fetchFromMusicBrainz(artist, title) {
      try {
        const cleanTitle = (title || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
        const useCleanTitle = cleanTitle && cleanTitle !== title;
        const queries = [
          `release:"${title}" AND artist:"${artist}"`,
          `release:${title} AND artist:${artist}`,
        ];
        if (useCleanTitle) {
          queries.push(`release:"${cleanTitle}" AND artist:"${artist}"`);
          queries.push(`release:${cleanTitle} AND artist:${artist}`);
        }

        let candidates = [];
        for (const q of queries) {
          const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(q)}&fmt=json&limit=5`;
          const resp = await fetch(url, { headers: { Accept: 'application/json' } });
          if (!resp.ok) continue;
          const data = await resp.json();
          if (data.releases && data.releases.length) {
            candidates = data.releases;
            break;
          }
        }

        if (!candidates.length) return null;

        let bestTracks = null;
        let bestRatio = 0;

        for (let i = 0; i < Math.min(3, candidates.length); i++) {
          const release = candidates[i];
          const detailUrl = `https://musicbrainz.org/ws/2/release/${release.id}?inc=recordings&fmt=json`;
          const detailResp = await fetch(detailUrl, { headers: { Accept: 'application/json' } });
          if (!detailResp.ok) continue;
          const detail = await detailResp.json();

          const tracks = [];
          let withDurationCount = 0;
          const mediumCount = (detail.media || []).length;
          (detail.media || []).forEach((disc, discIdx) => {
            (disc.tracks || []).forEach(t => {
              const lengthMs = t.length || (t.recording && t.recording.length) || 0;
              const seconds = Math.floor(lengthMs / 1000);
              if (seconds > 0) withDurationCount++;
              const pos = mediumCount > 1
                ? `${discIdx + 1}-${t.number || t.position || ''}`
                : (t.number || t.position || '').toString();
              tracks.push({
                position: pos,
                title: t.title || (t.recording && t.recording.title) || 'Unknown',
                duration: seconds ? this.formatTime(seconds) : '',
                _seconds: seconds,
              });
            });
          });

          const ratio = tracks.length > 0 ? withDurationCount / tracks.length : 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestTracks = tracks;
          }
          if (ratio >= 0.9) break;
        }

        return bestRatio > 0 ? bestTracks : null;
      } catch {
        return null;
      }
    },
    parseDuration(str) {
      if (!str) return 0;
      const parts = str.trim().split(':').map(Number);
      if (parts.some(isNaN)) return 0;
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 1) return parts[0];
      return 0;
    },
    selectAlbum(index) {
      this.selectedIndex = index;
      this.progress = 0;
      this.activeTab = 'nowPlaying';
    },
    nextAlbum() {
      if (!this.albums.length) return;
      this.selectedIndex = (this.selectedIndex + 1) % this.albums.length;
      this.progress = 0;
    },
    prevAlbum() {
      if (!this.albums.length) return;
      this.selectedIndex = (this.selectedIndex - 1 + this.albums.length) % this.albums.length;
      this.progress = 0;
    },
    togglePlay() {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        this.startProgressTick();
      } else {
        this.stopProgressTick();
      }
    },
    startProgressTick() {
      this.stopProgressTick();
      this.progressInterval = setInterval(() => {
        const duration = this.currentDuration;
        if (!duration) return;
        const stepPercent = (TICK_MS / 1000 / duration) * 100;
        this.progress += stepPercent;
        if (this.progress >= 100) {
          this.progress = 0;
          this.nextAlbum();
        }
      }, TICK_MS);
    },
    stopProgressTick() {
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
    },
    onSeek(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      this.progress = pct;
    },
    switchTab(tabId) {
      if (tabId === 'nowPlaying' && this.selectedIndex === null) return;
      this.activeTab = tabId;
    },
    formatTime(seconds) {
      const total = Math.max(0, Math.floor(seconds));
      const m = Math.floor(total / 60);
      const s = total % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    },
  },
};
</script>

<style scoped>
.wmp {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 60%, #0e0e0e 100%);
  font-family: 'PortfolioFont', sans-serif;
  color: #fff;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
  letter-spacing: 0;
  position: relative;
}

.wmp::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  pointer-events: none;
}

.wmp button,
.wmp input {
  font-family: inherit;
  color: inherit;
  text-shadow: inherit;
  letter-spacing: 0;
}

.wmp-disclaimer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 12px;
  background: rgba(155, 32, 183, 0.18);
  border-bottom: 1px solid rgba(155, 32, 183, 0.45);
  flex-shrink: 0;
}

.disclaimer-icon {
  font-size: 15px;
  flex-shrink: 0;
}

/* Tabs */
.wmp-tabs {
  display: flex;
  background: linear-gradient(180deg, #2a2a2a 0%, #141414 100%);
  border-bottom: 1px solid #000;
  padding: 0 8px;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.04);
}

.wmp-tab {
  background: transparent;
  border: none;
  padding: 12px 22px;
  font-size: 13px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s, opacity 0.15s;
}

.wmp-tab:hover:not(.disabled) {
  background: rgba(155, 32, 183, 0.1);
}

.wmp-tab.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wmp-tab.active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #9b20b7, transparent);
  box-shadow: 0 0 8px rgba(155, 32, 183, 0.7);
}


/* Main */
.wmp-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* State screens */
.state-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 24px;
  font-size: 13px;
}

.state-detail { font-size: 13px; max-width: 340px; }

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(155, 32, 183, 0.2);
  border-top-color: #9b20b7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-button {
  background: linear-gradient(180deg, #9b20b7, #6a1480);
  border: 1px solid #4a1060;
  border-radius: 3px;
  padding: 8px 20px;
  cursor: pointer;
  font-size: 13px;
}

.retry-button:hover { background: linear-gradient(180deg, #b228d2, #7c1894); }

/* Now Playing */
.now-playing {
  flex: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 32px;
  padding: 32px;
  align-items: center;
  overflow: auto;
}

.media-panel {
  flex-shrink: 0;
  width: 260px;
}

.cover-frame {
  position: relative;
  width: 260px;
  height: 260px;
  background: #000;
  border: 1px solid #000;
  border-radius: 2px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.tracklist-frame {
  width: 260px;
  height: 260px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #000;
  border-radius: 2px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tracklist-title {
  font-size: 13px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(155, 32, 183, 0.4);
  background: rgba(155, 32, 183, 0.15);
  flex-shrink: 0;
}

.tracklist-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  padding: 16px;
  text-align: center;
}

.tracklist {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.tracklist-row {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  line-height: 1.3;
}

.tracklist-row:hover {
  background: rgba(155, 32, 183, 0.12);
}

.track-pos {
  font-size: 11px;
  opacity: 0.7;
}

.track-title-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-duration {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.tracklist::-webkit-scrollbar {
  width: 6px;
}

.tracklist::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #555, #2a2a2a);
  border-radius: 3px;
}

.info-toggle {
  margin-top: 12px;
  align-self: flex-start;
  background: linear-gradient(180deg, #9b20b7, #6a1480);
  border: 1px solid #4a1060;
  border-radius: 3px;
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, transform 0.08s;
}

.info-toggle:hover {
  background: linear-gradient(180deg, #b228d2, #7c1894);
}

.info-toggle:active {
  transform: scale(0.97);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  color: #555;
  background: linear-gradient(135deg, #2a1240, #1a0820);
}

.cover-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 30px rgba(155, 32, 183, 0.15);
}

.track-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.track-title {
  font-size: 22px;
  line-height: 1.2;
  word-wrap: break-word;
}

.track-artist {
  font-size: 16px;
  margin-bottom: 4px;
}



/* Library */
.library {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.library-tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 4px;
  padding: 6px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}

.library-tile:hover {
  background: rgba(155, 32, 183, 0.08);
  transform: translateY(-1px);
}

.library-tile.active {
  border-color: #9b20b7;
  background: rgba(155, 32, 183, 0.12);
}

.tile-cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #1a1a1a;
  border: 1px solid #000;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.tile-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tile-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 32px;
  background: linear-gradient(135deg, #2a1240, #1a0820);
}

.tile-title {
  font-size: 13px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tile-artist {
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Controls footer */
.wmp-controls {
  background: linear-gradient(180deg, #1a1a1a, #0a0a0a);
  border-top: 1px solid #000;
  padding: 10px 18px 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6a1480, #9b20b7, #c44de0);
  border-radius: 3px;
  transition: width 0.4s linear;
  box-shadow: 0 0 6px rgba(155, 32, 183, 0.5);
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: radial-gradient(circle at 30% 30%, #fff, #9b20b7);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  transition: left 0.4s linear;
}

.time-readout {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.transport-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.transport-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctrl-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 25%, #4a4a4a, #1a1a1a 70%);
  border: 1px solid #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.5);
  transition: transform 0.08s, background 0.15s;
}

.ctrl-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}

.ctrl-btn:hover {
  background: radial-gradient(circle at 30% 25%, #5a5a5a, #2a2a2a 70%);
}

.ctrl-btn:active {
  transform: scale(0.95);
}

.ctrl-btn.primary {
  width: 44px;
  height: 44px;
  background: radial-gradient(circle at 30% 25%, #c44de0, #6a1480 70%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 2px 8px rgba(155, 32, 183, 0.5);
}

.ctrl-btn.primary svg {
  width: 16px;
  height: 16px;
}

.ctrl-btn.primary:hover {
  background: radial-gradient(circle at 30% 25%, #d465ee, #7c1894 70%);
}

.volume-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-icon svg {
  width: 14px;
  height: 14px;
  display: block;
}

.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.5);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 10px;
  height: 10px;
  background: radial-gradient(circle at 30% 30%, #fff, #9b20b7);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.volume-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  background: radial-gradient(circle at 30% 30%, #fff, #9b20b7);
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

/* Scrollbars */
.library::-webkit-scrollbar,
.now-playing::-webkit-scrollbar {
  width: 8px;
}

.library::-webkit-scrollbar-track,
.now-playing::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.library::-webkit-scrollbar-thumb,
.now-playing::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #555, #2a2a2a);
  border-radius: 4px;
}

/* Hamburger toggle for cover/tracklist (mobile only) */
.np-hamburger {
  display: none;
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  width: 40px;
  height: 40px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(155, 32, 183, 0.6);
  border-radius: 8px;
  cursor: pointer;
}

.np-hamburger span {
  display: block;
  width: 18px;
  height: 2px;
  background: #fff;
  border-radius: 1px;
}

/* Mobile: stack now-playing, fluid cover, 2-column library */
@media (max-width: 768px) {
  .now-playing {
    position: relative;
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
    padding-top: 60px;
    justify-items: center;
    align-items: start;
  }

  .np-hamburger {
    display: flex;
  }

  .info-toggle {
    display: none;
  }

  .media-panel {
    width: 100%;
    max-width: 280px;
    flex-shrink: 1;
  }

  .cover-frame {
    width: 100%;
    max-width: 280px;
    height: auto;
    aspect-ratio: 1 / 1;
  }

  .tracklist-frame {
    width: 100%;
    max-width: 280px;
    height: 280px;
  }

  .track-info {
    text-align: center;
  }

  .library-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
