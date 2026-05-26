<template>
  <div class="desktop">
    <!-- About Me (1st) -->
    <div class="app-icon" @click="openApp('aboutMe')">
      <div class="app-icon-image">
        <font-awesome-icon icon="user" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('aboutMe') }}</div>
    </div>

    <!-- Projects (2nd) -->
    <div class="app-icon" @click="openApp('projects')">
      <div class="app-icon-image">
        <font-awesome-icon icon="folder" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('projects') }}</div>
    </div>

    <!-- Art Gallery (3rd) -->
    <div class="app-icon" @click="openApp('artGallery')">
      <div class="app-icon-image">
        <font-awesome-icon icon="palette" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('artGallery') }}</div>
    </div>

    <!-- Contact (4th) - Replaced Certificates -->
    <div class="app-icon" @click="openApp('contact')">
      <div class="app-icon-image">
        <font-awesome-icon icon="envelope" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('contact') }}</div>
    </div>

    <!-- Downloads (5th) -->
    <div class="app-icon" @click="openApp('downloads')">
      <div class="app-icon-image">
        <font-awesome-icon icon="download" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('downloads') }}</div>
    </div>


    <!-- Desktop-only apps (hidden on mobile) -->
    <div class="desktop-only app-icon" @click="openApp('minigames')">
      <div class="app-icon-image">
        <font-awesome-icon icon="folder" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('minigames') }}</div>
    </div>

    <!-- Vinyl Collection -->
    <div class="desktop-only app-icon" @click="openApp('vinylCollection')">
      <div class="app-icon-image">
        <font-awesome-icon icon="compact-disc" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('vinylCollection') }}</div>
    </div>

    <!-- Skill Tree -->
    <div class="desktop-only app-icon" @click="openApp('skillTree')">
      <div class="app-icon-image">
        <font-awesome-icon icon="sitemap" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('skillTree') }}</div>
    </div>

    <!-- MudaDigitaal terminal -->
    <div class="app-icon" @click="openApp('mudaDigitaal')">
      <div class="app-icon-image">
        <font-awesome-icon icon="terminal" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('mudaDigitaal') }}</div>
    </div>

    <!-- Paint -->
    <div class="app-icon" @click="openApp('paint')">
      <div class="app-icon-image">
        <font-awesome-icon icon="paintbrush" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('paint') }}</div>
    </div>

    <!-- Achievements -->
    <div class="app-icon" @click="openApp('achievements')">
      <div class="app-icon-image">
        <font-awesome-icon icon="trophy" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('achievements') }}</div>
    </div>

    <!-- Settings -->
    <div class="app-icon" @click="openApp('settings')">
      <div class="app-icon-image">
        <font-awesome-icon icon="cog" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('settings') }}</div>
    </div>


    <!-- Easter egg apps -->
    <div class="app-icon" v-for="app in easterEggApps" :key="app" @click="openApp(app)">
      <div class="app-icon-image">
        <font-awesome-icon icon="egg" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('easterEgg') }}</div>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

export default {
  props: {
    openApp: {
      type: Function,
      required: true,
    },
    easterEggApps: {
      type: Array,
      required: true,
    },
  },
  components: {
    FontAwesomeIcon,
  },
};
</script>