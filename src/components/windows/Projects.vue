<template>
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
        <a
          v-if="selectedProject.repository"
          :href="selectedProject.repository"
          target="_blank"
          class="project-repository"
        >
          {{ $t('goToRepository') }}
        </a>
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
            <a
              v-if="selectedProject.repository"
              :href="selectedProject.repository"
              target="_blank"
              class="project-modal-repository"
            >
              {{ $t('goToRepository') }}
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
      showModal: false,
      isMobile: false
    };
  },
  methods: {
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
    },
    initializeProjects() {
      this.projects = [
        {
          title: this.$t('uwp'),
          image: new URL('@/assets/img/projects/unnamed-weather-app.webp', import.meta.url).href,
          description: this.$t('uwpDescription'),
          link: "https://weather.rickmuda.nl",
          repository: "https://github.com/rickmuda/unnamed-weather-app"
        },
        {
          title: this.$t('aw'),
          image: new URL('@/assets/img/projects/irritante-webpagina.webp', import.meta.url).href,
          description: this.$t('awDescription'),
          link: "https://annoying.rickmuda.nl",
          repository: "https://github.com/rickmuda/annoying-webpage"
        },
        {
          title: this.$t('wam'),
          image: new URL('@/assets/img/projects/whack-a-mom.webp', import.meta.url).href,
          description: this.$t('wamDescription'),
          link: "https://whackamom.rickmuda.nl",
          repository: "https://github.com/rickmuda/whack-a-mom"
        },
        {
          title: this.$t('gl'),
          image: new URL('@/assets/img/projects/gym-list.webp', import.meta.url).href,
          description: this.$t('glDescription'),
          link: "https://gymlist.rickmuda.nl",
          repository: "https://github.com/rickmuda/gym-list"
        },
        {
          title: this.$t('op'),
          image: new URL('@/assets/img/projects/one-pager.webp', import.meta.url).href,
          description: this.$t('opDescription'),
          link: "https://onepager.rickmuda.nl",
          repository: "https://github.com/rickmuda/one-pager"
        },
        {
          title: this.$t('sp'),
          image: new URL('@/assets/img/projects/snackbar-podcast.webp', import.meta.url).href,
          description: this.$t('spDescription'),
          link: "https://www.youtube.com/watch?v=-JeNEwwF-Ms"
          // No repository for YouTube video
        },
        {
          title: this.$t('us'),
          image: new URL('@/assets/img/projects/undertale-sudoku.webp', import.meta.url).href,
          description: this.$t('usDescription'),
          link: "https://sudoku.rickmuda.nl",
          repository: "https://github.com/rickmuda/undertale-sudoku"
        },
        {
          title: this.$t('lvt'),
          image: new URL('@/assets/img/projects/longvideotheater.webp', import.meta.url).href,
          description: this.$t('lvtDescription'),
          link: "https://lvt.rickmuda.nl",
          repository: "https://github.com/rickmuda/longvideotheater"
        },
        {
          title: this.$t('dnm'),
          image: new URL('@/assets/img/projects/dungeon and music.webp', import.meta.url).href,
          description: this.$t('dnmDescription'),
          link: "https://dnm.rickmuda.nl",
          repository: "https://github.com/rickmuda/dungeons-and-music"
        },
        {
          title: this.$t('syp'),
          image: new URL('@/assets/img/projects/secondyearportfolio.webp', import.meta.url).href,
          description: this.$t('sypDescription'),
          link: "https://second.rickmuda.nl",
          repository: "https://github.com/rickmuda/second-year-portfolio"
        },
        {
          title: this.$t('fyp'),
          image: new URL('@/assets/img/projects/firstyearportfolio.webp', import.meta.url).href,
          description: this.$t('fypDescription'),
          link: "https://first.rickmuda.nl",
          repository: "https://github.com/rickmuda/first-year-portfolio"
        },
        {
          title: this.$t('qt'),
          image: new URL('@/assets/img/projects/qt.webp', import.meta.url).href,
          description: this.$t('qtDescription'),
          link: "https://quietturn.rickmuda.nl/"
        },
      ];
    }
  },
  created() {
    this.initializeProjects();
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile);
  }
};
</script>