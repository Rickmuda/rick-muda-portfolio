<template>
  <div class="explorer-window">
    <div class="explorer-pane list-pane">
      <div class="details-header">
        <span>Name</span>
        <span>Type</span>
        <span>Status</span>
      </div>
      <button
        v-for="project in projects"
        :key="project.title"
        class="details-row"
        :class="{ selected: selectedProject?.title === project.title }"
        @click="selectProject(project)"
      >
        <span class="name">{{ project.title }}</span>
        <span>Web Project</span>
        <span>Published</span>
      </button>
    </div>

    <div class="explorer-pane preview-pane" v-if="selectedProject">
      <img :src="selectedProject.image" alt="Selected Project Image" class="preview-image" />
      <h3>{{ selectedProject.title }}</h3>
      <p>{{ selectedProject.description }}</p>
      <div class="project-links">
        <a :href="selectedProject.link" target="_blank" class="project-link">{{ $t('goToProject') }}</a>
        <a v-if="selectedProject.repository" :href="selectedProject.repository" target="_blank" class="project-link alt">GitHub</a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      projects: [],
      selectedProject: null,
    };
  },
  methods: {
    selectProject(project) {
      this.selectedProject = project;
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
    this.selectedProject = this.projects[0] || null;
  }
};
</script>

<style scoped>
.explorer-window {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  height: 100%;
  border: 2px solid #000;
  background: #f0f0f0;
}

.explorer-pane {
  padding: 12px;
}

.list-pane {
  border-right: 2px solid #000;
  overflow: auto;
  background: #fff;
}

.details-header,
.details-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 10px;
  align-items: center;
}

.details-header {
  font-weight: bold;
  border-bottom: 2px solid #8404a1;
  padding: 8px;
  color: #3d114a;
}

.details-row {
  width: 100%;
  border: none;
  border-bottom: 1px solid #ddd;
  padding: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.details-row:hover {
  background: #f3e6f7;
}

.details-row.selected {
  background: #d89be8;
}

.name {
  font-weight: 600;
}

.preview-pane {
  background: #ece2f2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.preview-image {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border: 2px solid #4f115d;
}

.project-links {
  display: flex;
  gap: 10px;
}

.project-link {
  padding: 8px 12px;
  border-radius: 6px;
  color: #fff;
  text-decoration: none;
  background: #9b20b7;
  border: 1px solid #4f115d;
}

.project-link.alt {
  background: #4f115d;
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
}
</style>