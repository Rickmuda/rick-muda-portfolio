<template>
<<<<<<< Updated upstream
  <div class="projects-window">
    <!-- Projects Grid -->
    <div class="projects-grid" :class="{ 'grid-expanded': selectedProject && !isMobile }">
      <div
        v-for="(project, index) in projects"
        :key="index"
        class="project-card"
        :class="{ selected: selectedProject === project && !isMobile }"
        @click="handleProjectClick(project)"
      >
        <img :src="project.image" alt="Project Image" />
        <p>{{ project.title }}</p>
      </div>
    </div>

    <!-- Project Details for Desktop -->
    <div v-if="selectedProject && !isMobile" class="project-details">
      <img :src="selectedProject.image" alt="Selected Project Image" />
      <h3>{{ selectedProject.title }}</h3>
      <p>{{ selectedProject.description }}</p>
      <div class="project-buttons">
        <a
          :href="selectedProject.link"
          target="_blank"
          class="project-link"
        >
          {{ $t('goToProject') }}
        </a>
=======
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
    </div>

    <div class="explorer-pane preview-pane" v-if="selectedProject">
      <!-- Image carousel container -->
      <div class="carousel-container">
        <div class="carousel-viewport">
          <img :src="selectedProject.images[currentImageIndex]" alt="Project Image" class="carousel-image" />
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
>>>>>>> Stashed changes
      </div>
    </div>

    <!-- Modal for Mobile -->
    <teleport to="body">
      <div v-if="showModal" class="projects-modal" @click.self="closeModal">
        <div class="project-modal-content">
          <img :src="selectedProject.image" alt="Selected Project" class="project-modal-image" />
          <h3 class="project-modal-title">{{ selectedProject.title }}</h3>
          <p class="project-modal-description">{{ selectedProject.description }}</p>
          <div class="project-modal-buttons">
            <a
              :href="selectedProject.link"
              target="_blank"
              class="project-modal-link"
            >
              {{ $t('goToProject') }}
            </a>
          </div>
        </div>
        <button class="project-modal-close" @click="closeModal">
          <span>X</span>
        </button>
      </div>
    </teleport>
  </div>
</template>

<script>
export default {
  data() {
    return {
      projects: [],
      selectedProject: null,
<<<<<<< Updated upstream
      showModal: false,
      isMobile: false
=======
      currentImageIndex: 0,
      carouselInterval: null,
      sortBy: 'date',
      sortDirection: 'desc',
>>>>>>> Stashed changes
    };
  },
  computed: {
    sortedProjects() {
      const typeOrder = { 'Web Project': 0, 'Portfolio': 1, 'Video Project': 2, 'Game': 3 };
      const statusOrder = { 'Published': 0, 'W.I.P': 1, 'Outdated': 2 };
      
      return [...this.projects].sort((a, b) => {
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
  methods: {
<<<<<<< Updated upstream
    handleProjectClick(project) {
      this.selectedProject = project;
      // Show modal only on mobile
      if (this.isMobile) {
        this.showModal = true;
      }
    },
    closeModal() {
      this.showModal = false;
    },
    selectProject(project) {
      if (!this.isMobile) {
        this.selectedProject = this.selectedProject === project ? null : project;
      } else {
        this.handleProjectClick(project);
      }
    },
    checkMobile() {
      this.isMobile = window.innerWidth <= 768;
=======
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
>>>>>>> Stashed changes
    },
    initializeProjects() {
      // Placeholder images for carousel
      const placeholder1 = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%234a3a6a%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%239b20b7%22 text-anchor=%22middle%22 dy=%22.3em%22%3EAdditional View%3C/text%3E%3C/svg%3E';
      const placeholder2 = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%235a4a7a%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 fill=%22%23d99be8%22 text-anchor=%22middle%22 dy=%22.3em%22%3EGallery Image%3C/text%3E%3C/svg%3E';

      this.projects = [
        {
          title: this.$t('uwp'),
          type: 'Web Project',
          dateCreated: '2024-06-04',
          images: [
            new URL('@/assets/img/projects/weather1.webp', import.meta.url).href,
            new URL('@/assets/img/projects/weather2.webp', import.meta.url).href,
            new URL('@/assets/img/projects/weather3.webp', import.meta.url).href
          ],
          description: this.$t('uwpDescription'),
          link: "https://weather.rickmuda.nl",
          repository: "https://github.com/rickmuda/unnamed-weather-app"
        },
        {
          title: this.$t('aw'),
          type: 'Web Project',
          dateCreated: '2022-09-20',
          images: [
            new URL('@/assets/img/projects/annoying1.webp', import.meta.url).href,
            new URL('@/assets/img/projects/annoying2.webp', import.meta.url).href,
            new URL('@/assets/img/projects/annoying3.webp', import.meta.url).href
          ],
          description: this.$t('awDescription'),
          link: "https://annoying.rickmuda.nl",
          repository: "https://github.com/rickmuda/annoying-webpage"
        },
        {
          title: this.$t('wam'),
          type: 'Game',
          dateCreated: '2022-11-10',
          images: [
            new URL('@/assets/img/projects/whack1.webp', import.meta.url).href,
            new URL('@/assets/img/projects/whack2.webp', import.meta.url).href,
            new URL('@/assets/img/projects/whack3.webp', import.meta.url).href
          ],
          description: this.$t('wamDescription'),
          link: "https://whackamom.rickmuda.nl",
          repository: "https://github.com/rickmuda/whack-a-mom"
        },
        {
          title: this.$t('gl'),
          type: 'Web Project',
          dateCreated: '2023-01-08',
          images: [
            new URL('@/assets/img/projects/gym-list.webp', import.meta.url).href
          ],
          description: this.$t('glDescription'),
          link: "https://gymlist.rickmuda.nl",
          repository: "https://github.com/rickmuda/gym-list",
          status: 'Outdated'
        },
        {
          title: this.$t('op'),
          type: 'Web Project',
          dateCreated: '2022-08-12',
          images: [
            new URL('@/assets/img/projects/one-pager.webp', import.meta.url).href
          ],
          description: this.$t('opDescription'),
          link: "https://onepager.rickmuda.nl",
          repository: "https://github.com/rickmuda/one-pager",
          status: 'Outdated'
        },
        {
          title: this.$t('sp'),
          type: 'Video Project',
          dateCreated: '2023-11-27',
          images: [
            new URL('@/assets/img/projects/snackbar-podcast.webp', import.meta.url).href
          ],
          description: this.$t('spDescription'),
          link: "https://www.youtube.com/watch?v=-JeNEwwF-Ms"
        },
        {
          title: this.$t('us'),
          type: 'Game',
          dateCreated: '2024-06-07',
          images: [
            new URL('@/assets/img/projects/undertale-sudoku.webp', import.meta.url).href
          ],
          description: this.$t('usDescription'),
          link: "https://sudoku.rickmuda.nl",
          repository: "https://github.com/rickmuda/undertale-sudoku",
          status: 'Outdated'
        },
        {
          title: this.$t('lvt'),
          type: 'Web Project',
          dateCreated: '2023-07-30',
          images: [
            new URL('@/assets/img/projects/longvideotheater.webp', import.meta.url).href
          ],
          description: this.$t('lvtDescription'),
          link: "https://lvt.rickmuda.nl",
          disabled: true,
          status: 'W.I.P'
        },
        {
          title: this.$t('dnm'),
          type: 'Game',
          dateCreated: '2025-04-12',
          images: [
            new URL('@/assets/img/projects/dungeon and music.webp', import.meta.url).href
          ],
          description: this.$t('dnmDescription'),
          link: "https://dnm.rickmuda.nl",
          repository: "https://github.com/rickmuda/dungeons-and-music"
        },
        {
          title: this.$t('syp'),
          type: 'Portfolio',
          dateCreated: '2023-10-18',
          images: [
            new URL('@/assets/img/projects/portfolio1.webp', import.meta.url).href,
            new URL('@/assets/img/projects/portfolio2.webp', import.meta.url).href,
            new URL('@/assets/img/projects/portfolio3.webp', import.meta.url).href
          ],
          description: this.$t('sypDescription'),
          link: "https://second.rickmuda.nl",
          repository: "https://github.com/rickmuda/second-year-portfolio",
          status: 'Outdated'
        },
        {
          title: this.$t('qt'),
          type: 'Web Project',
          dateCreated: '2026-02-23',
          images: [
            new URL('@/assets/img/projects/quiet1.webp', import.meta.url).href,
            new URL('@/assets/img/projects/quiet2.webp', import.meta.url).href,
            new URL('@/assets/img/projects/quiet3.webp', import.meta.url).href
          ],
          description: this.$t('qtDescription'),
          link: "https://quietturn.rickmuda.nl/"
        },
      ];
    }
  },
  created() {
    this.initializeProjects();
<<<<<<< Updated upstream
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile);
  }
};
</script>
=======
    this.selectedProject = this.projects[0] || null;
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

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: fadeIn 0.3s ease;
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
</style>
>>>>>>> Stashed changes
