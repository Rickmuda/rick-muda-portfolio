<template>
  <div class="explorer-window" :class="{ 'project-selected': selectedProject }">
    <div class="explorer-pane list-pane" @click="deselectProject">
      <div class="details-header">
        <span class="sortable" @click.stop="toggleSort('name')">
          Name
          <span v-if="sortBy === 'name'" class="sort-arrow">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
        </span>
        <span class="sortable" @click.stop="toggleSort('type')">
          Type
          <span v-if="sortBy === 'type'" class="sort-arrow">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
        </span>
        <span class="sortable" @click.stop="toggleSort('status')">
          Status
          <span v-if="sortBy === 'status'" class="sort-arrow">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
        </span>
        <span v-if="!selectedProject" class="sortable" @click.stop="toggleSort('date')">
          Created
          <span v-if="sortBy === 'date'" class="sort-arrow">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
        </span>
      </div>
      <button
        v-for="project in sortedProjects"
        :key="project.title"
        class="details-row"
        :class="{ selected: selectedProject?.title === project.title }"
        @click.stop="selectProject(project)"
      >
        <span class="name">{{ project.title }}</span>
        <span>{{ project.type }}</span>
        <span>{{ project.status || 'Published' }}</span>
        <span v-if="!selectedProject">{{ project.dateCreated }}</span>
      </button>
      <div v-if="!sortedProjects.length" class="details-empty">{{ $t('emptyFolder') }}</div>
    </div>

    <div class="explorer-pane preview-pane" v-if="selectedProject">
      <!-- Image carousel container -->
      <div class="carousel-container">
        <div class="carousel-viewport" :class="{ 'is-phone-shot': isPhoneShot(selectedProject) }">
          <img
            :src="selectedProject.images[currentImageIndex]"
            alt="Project Image"
            class="carousel-image"
            :class="{ 'is-phone-shot': isPhoneShot(selectedProject) }"
            loading="lazy"
            decoding="async"
          />
        </div>
        <!-- Navigation dots -->
        <div class="carousel-dots" v-if="selectedProject.images.length > 1">
          <button
            v-for="(_, index) in selectedProject.images"
            :key="index"
            class="dot"
            :class="{ active: currentImageIndex === index }"
            @click="goToImage(index)"
            :aria-label="`Image ${index + 1}`"
          ></button>
        </div>
      </div>

      <div class="content-wrapper">
        <h3>{{ selectedProject.title }}</h3>
        <p>{{ selectedProject.description }}</p>
      </div>

      <div class="project-links">
        <a
          :href="selectedProject.disabled ? null : selectedProject.link"
          :target="selectedProject.disabled ? null : '_blank'"
          class="project-link"
          :class="{ disabled: selectedProject.disabled }"
        >{{ $t('goToProject') }}</a>
      </div>
    </div>
  </div>

  <!-- Mobile: master-detail (desktop uses the explorer above) -->
  <div class="projects-mobile">
    <!-- Main list page -->
    <div v-if="!pmSelected" class="pm-list">
      <button
        v-for="project in sortedProjects"
        :key="project.title"
        class="pm-row"
        @click="pmOpen(project)"
      >
        <img :src="project.images[0]" :alt="project.title" class="pm-row-thumb" loading="lazy" decoding="async" />
        <span class="pm-row-info">
          <span class="pm-row-title">{{ project.title }}</span>
          <span class="pm-row-meta">{{ project.type }} - {{ project.status || 'Published' }}</span>
        </span>
      </button>
    </div>

    <!-- Detail page -->
    <div v-else class="pm-detail">
      <button class="pm-back" @click="pmBack">&#8592; Back</button>
      <div
        class="pm-carousel"
        :class="{ 'is-phone-shot': isPhoneShot(pmSelected) }"
        @touchstart.passive="pmTouchStart"
        @touchmove.passive="pmTouchMove"
        @touchend="pmTouchEnd"
      >
        <img
          :src="pmSelected.images[pmDetailIndex]"
          :alt="pmSelected.title"
          class="pm-image"
          :class="{ 'is-phone-shot': isPhoneShot(pmSelected) }"
          loading="lazy"
          decoding="async"
        />
        <div class="pm-dots" v-if="pmSelected.images.length > 1">
          <button
            v-for="(_, idx) in pmSelected.images"
            :key="idx"
            class="pm-dot"
            :class="{ active: pmDetailIndex === idx }"
            @click="setPmDetailIndex(idx)"
            :aria-label="`Image ${idx + 1}`"
          ></button>
        </div>
      </div>
      <h3 class="pm-title">{{ pmSelected.title }}</h3>
      <div class="pm-meta">{{ pmSelected.type }} - {{ pmSelected.status || 'Published' }}</div>
      <p class="pm-desc">{{ pmSelected.description }}</p>
      <a
        :href="pmSelected.disabled ? null : pmSelected.link"
        :target="pmSelected.disabled ? null : '_blank'"
        class="pm-link"
        :class="{ disabled: pmSelected.disabled }"
      >{{ $t('goToProject') }}</a>
    </div>
  </div>
</template>

<script>
import { projects as projectsData } from "../../projectsData";

export default {
  props: {
    // 'active' = live projects, 'recycle' = scrapped / back-burner projects.
    variant: { type: String, default: 'active' },
    // Optional { projectTitleKey } set by the start-menu search to pre-select a project.
    selection: { type: Object, default: null },
  },
  data() {
    return {
      projects: [],
      recycleProjects: [],
      selectedProject: null,
      currentImageIndex: 0,
      carouselInterval: null,
      sortBy: 'date',
      sortDirection: 'desc',
      pmSelected: null,
      pmDetailIndex: 0,
      pmTouchStartX: 0,
      pmTouchStartY: 0,
      pmTouchDeltaX: 0,
      pmIsSwiping: false,
    };
  },
  computed: {
    sortedProjects() {
      const typeOrder = { 'Web Project': 0, 'Portfolio': 1, 'Video Project': 2, 'Game': 3 };
      const statusOrder = { 'Published': 0, 'W.I.P': 1, 'Outdated': 2, 'Private': 3, 'Scrapped': 4 };
      const source = this.variant === 'recycle' ? this.recycleProjects : this.projects;

      return [...source].sort((a, b) => {
        let comparison = 0;
        
        switch (this.sortBy) {
          case 'name':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'type':
            comparison = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
            break;
          case 'status':
            const statusA = a.status || 'Published';
            const statusB = b.status || 'Published';
            comparison = (statusOrder[statusA] ?? 99) - (statusOrder[statusB] ?? 99);
            break;
          case 'date':
            comparison = new Date(b.dateCreated) - new Date(a.dateCreated);
            break;
        }
        
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }
  },
  watch: {
    selection() {
      this.applySelection();
    },
  },
  methods: {
    // Mobile App screenshots are tall phone captures, not wide desktop shots -
    // cropping them with object-fit: cover chops off most of the screen, so
    // they get a taller box and object-fit: contain instead.
    isPhoneShot(project) {
      return !!project && project.type === 'Mobile App';
    },
    // Select a specific project when the start-menu search points us at one.
    applySelection() {
      if (!this.selection || !this.selection.projectTitleKey) return false;
      const match = this.sortedProjects.find((p) => p.titleKey === this.selection.projectTitleKey);
      if (match) {
        this.selectProject(match);
        // Mobile layout uses its own detail state.
        this.pmSelected = match;
        this.pmDetailIndex = 0;
        return true;
      }
      return false;
    },
    selectProject(project) {
      // Clear any existing interval before switching projects
      clearInterval(this.carouselInterval);
      this.carouselInterval = null;
      
      this.selectedProject = project;
      this.currentImageIndex = 0;
      this.startCarousel();
    },
    deselectProject(event) {
      // Deselect if clicking on empty space in list pane (not on a button or header)
      if (event.target.classList.contains('list-pane')) {
        clearInterval(this.carouselInterval);
        this.carouselInterval = null;
        this.selectedProject = null;
      }
    },
    handleWindowClick(event) {
      // Deselect if clicking on list pane area but not on a button
      const listPane = event.currentTarget.querySelector('.list-pane');
      if (listPane && listPane.contains(event.target) && 
          !event.target.closest('.details-row') && 
          !event.target.closest('.details-header')) {
        this.deselectProject();
      }
    },
    goToImage(index) {
      this.currentImageIndex = index;
      this.restartCarousel();
    },
    nextImage() {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.selectedProject.images.length;
      this.restartCarousel();
    },
    previousImage() {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.selectedProject.images.length) % this.selectedProject.images.length;
      this.restartCarousel();
    },
    startCarousel() {
      // Clear any existing interval to prevent stacking
      clearInterval(this.carouselInterval);
      
      if (this.selectedProject && this.selectedProject.images.length > 1) {
        this.carouselInterval = setInterval(() => {
          this.currentImageIndex = (this.currentImageIndex + 1) % this.selectedProject.images.length;
        }, 3000);
      }
    },
    toggleSort(column) {
      if (this.sortBy === column) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortBy = column;
        this.sortDirection = 'asc';
      }
    },
    restartCarousel() {
      clearInterval(this.carouselInterval);
      this.startCarousel();
    },
    pmOpen(project) {
      this.pmSelected = project;
      this.pmDetailIndex = 0;
    },
    pmBack() {
      this.pmSelected = null;
    },
    setPmDetailIndex(idx) {
      this.pmDetailIndex = idx;
    },
    pmTouchStart(e) {
      this.pmTouchStartX = e.touches[0].clientX;
      this.pmTouchStartY = e.touches[0].clientY;
      this.pmTouchDeltaX = 0;
      this.pmIsSwiping = false;
    },
    pmTouchMove(e) {
      const dx = e.touches[0].clientX - this.pmTouchStartX;
      const dy = e.touches[0].clientY - this.pmTouchStartY;
      // Treat as a horizontal swipe only once it clearly outpaces vertical scroll
      if (!this.pmIsSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        this.pmIsSwiping = true;
      }
      if (this.pmIsSwiping) {
        this.pmTouchDeltaX = dx;
      }
    },
    pmTouchEnd() {
      if (!this.pmIsSwiping || !this.pmSelected) {
        this.pmIsSwiping = false;
        return;
      }
      const count = this.pmSelected.images.length;
      const threshold = 50;
      if (this.pmTouchDeltaX <= -threshold) {
        // Swipe left -> next image
        this.pmDetailIndex = (this.pmDetailIndex + 1) % count;
      } else if (this.pmTouchDeltaX >= threshold) {
        // Swipe right -> previous image
        this.pmDetailIndex = (this.pmDetailIndex - 1 + count) % count;
      }
      this.pmTouchDeltaX = 0;
      this.pmIsSwiping = false;
    },
    initializeProjects() {
      // Project data lives in src/projectsData.js (shared with the Project photos
      // gallery). Translate the i18n keys into display fields here.
      this.projects = projectsData.map((p) => ({
        ...p,
        title: this.$t(p.titleKey),
        description: this.$t(p.descKey),
      }));

      // Scrapped / back-burner projects shown in the Recycle Bin (variant='recycle').
      // Empty for now - add scrapped work here when there is some.
      this.recycleProjects = [];
    }
  },
  created() {
    this.initializeProjects();
    if (!this.applySelection()) {
      this.selectedProject = this.sortedProjects[0] || null;
    }
  },
  beforeUnmount() {
    clearInterval(this.carouselInterval);
  }
};
</script>

<style scoped>
.explorer-window {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  height: 100%;
  border: 2px solid #000;
  background: #1a1a24;
  transition: grid-template-columns 0.3s ease;
}

.explorer-window.project-selected {
  grid-template-columns: 1.2fr 1fr;
}

.explorer-window:not(.project-selected) {
  grid-template-columns: 1fr;
}

.explorer-pane {
  padding: 12px;
}

.list-pane {
  border-right: 2px solid #000;
  overflow: auto;
  background: #252535;
}

.details-header,
.details-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 10px;
  align-items: center;
}

.explorer-window.project-selected .details-header,
.explorer-window.project-selected .details-row {
  grid-template-columns: 2fr 1fr 1fr;
}

.details-header {
  font-weight: bold;
  border-bottom: 2px solid #8404a1;
  padding: 8px;
  color: #b98dc7;
}

.details-header .sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.details-header .sortable:hover {
  color: #d4a8e8;
}

.sort-arrow {
  font-size: 10px;
  margin-left: 4px;
}

.details-row {
  width: 100%;
  border: none;
  border-bottom: 1px solid #3a3a48;
  padding: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: #d0c8db;
  transition: background 0.2s ease;
}

.details-row:hover {
  background: #3a3a50;
}

.details-row.selected {
  background: #5a3a7a;
  color: #ffffff;
}

.name {
  font-weight: 600;
}

.details-empty {
  padding: 24px 12px;
  text-align: center;
  color: #8a7a95;
  font-size: 14px;
}

.preview-pane {
  background: #1f1f2d;
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: flex-start;
  padding: 16px;
  border: 2px solid #000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.content-wrapper {
  width: 100%;
  flex: 1;
}

.carousel-container {
  width: 100%;
  position: relative;
  margin-bottom: 16px;
}

.carousel-viewport {
  width: 100%;
  height: 280px;
  background: #0a0a0f;
  border: 2px solid #4f115d;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
}

/* Phone screenshots are tall/portrait - a wide, short box cropped with
   object-fit: cover cuts off most of the screen, so this box grows taller
   and the image is fully contained (letterboxed) instead of cropped. */
.carousel-viewport.is-phone-shot {
  height: 420px;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: fadeIn 0.3s ease;
}

.carousel-image.is-phone-shot {
  width: auto;
  object-fit: contain;
}

@keyframes fadeIn {
  from {
    opacity: 0.8;
  }
  to {
    opacity: 1;
  }
}

.carousel-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 12px 0 0 0;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid #ffffff;
  background: #ffffff;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  padding: 0;
}

.dot:hover {
  transform: scale(1.2);
}

.dot.active {
  background: #ffffff;
  border-color: #ffffff;
  opacity: 1;
}

.dot:not(.active) {
  opacity: 0.5;
}

.preview-pane h3 {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 12px 0;
}

.preview-pane p {
  color: #c0b8cc;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.project-links {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: auto;
  padding-top: 16px;
}

.project-link {
  flex: 1;
  padding: 10px 14px;
  border-radius: 6px;
  color: #fff;
  text-decoration: none;
  background: #9b20b7;
  border: 1px solid #7a1897;
  text-align: center;
  transition: background 0.2s ease;
  font-size: 13px;
  font-weight: 600;
}

.project-link:hover {
  background: #8313a0;
}

.project-link.alt {
  background: #4f115d;
  border-color: #5a1f6a;
}

.project-link.alt:hover {
  background: #5f1f6d;
}

.project-link.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

@media (max-width: 900px) {
  .explorer-window {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }

  .list-pane {
    border-right: none;
    border-bottom: 2px solid #000;
  }

  .carousel-viewport {
    height: 200px;
  }

  .preview-pane h3 {
    font-size: 18px;
  }
}

/* Mobile swipeable project cards (hidden on desktop) */
.projects-mobile {
  display: none;
}

@media (max-width: 768px) {
  .explorer-window {
    display: none;
  }

  .projects-mobile {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #1a1a24;
    border: 2px solid #000;
  }

  /* Main list page */
  .pm-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
    display: flex;
    flex-direction: column;
  }

  .pm-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 14px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #3a3a48;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    color: #d0c8db;
  }

  .pm-row:active {
    background: #2a2a3a;
  }

  .pm-row-thumb {
    width: 64px;
    height: 48px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #4f115d;
    background: #0a0a0f;
    flex-shrink: 0;
  }

  .pm-row-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .pm-row-title {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }

  .pm-row-meta {
    font-size: 12px;
    color: #b98dc7;
    font-weight: 600;
  }

  /* Detail page */
  .pm-detail {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
    display: flex;
    flex-direction: column;
    padding: 14px;
  }

  .pm-back {
    align-self: flex-start;
    background: #2a2a35;
    border: 1px solid #4f115d;
    color: #fff;
    border-radius: 6px;
    padding: 8px 14px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 14px;
  }

  .pm-carousel {
    position: relative;
    width: 100%;
    flex-shrink: 0;
    touch-action: pan-y;
  }

  .pm-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    background: #0a0a0f;
    border: 2px solid #4f115d;
    border-radius: 6px;
    user-select: none;
    -webkit-user-drag: none;
  }

  /* Phone screenshots: taller box, contained instead of cropped (see the
     desktop .carousel-viewport.is-phone-shot comment for why). */
  .pm-carousel.is-phone-shot .pm-image {
    height: 340px;
    width: auto;
    max-width: 100%;
    object-fit: contain;
    margin: 0 auto;
    display: block;
  }

  .pm-dots {
    display: flex;
    gap: 8px;
    justify-content: center;
    padding: 10px 0 0;
  }

  .pm-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.4);
    padding: 0;
    cursor: pointer;
  }

  .pm-dot.active {
    background: #fff;
  }

  .pm-title {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin: 14px 0 4px;
  }

  .pm-meta {
    color: #b98dc7;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .pm-desc {
    color: #c0b8cc;
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 16px;
  }

  .pm-link {
    display: block;
    text-align: center;
    padding: 14px;
    border-radius: 8px;
    color: #fff;
    text-decoration: none;
    background: #9b20b7;
    border: 1px solid #7a1897;
    font-size: 15px;
    font-weight: 600;
    margin-top: auto;
    flex-shrink: 0;
  }

  .pm-link.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}
</style>
