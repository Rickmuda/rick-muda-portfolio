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

<<<<<<< Updated upstream
    <!-- Socials (5th) -->
    <div class="app-icon" @click="openApp('socials')">
      <div class="app-icon-image">
        <font-awesome-icon icon="share-nodes" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('socials') }}</div>
    </div>

    <!-- Settings (6th) -->
    <div class="app-icon" @click="openApp('settings')">
      <div class="app-icon-image">
        <font-awesome-icon icon="cog" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('settings') }}</div>
    </div>

=======
>>>>>>> Stashed changes
    <!-- Desktop-only apps (hidden on mobile) -->
    <div class="desktop-only app-icon" @click="openApp('miniGame')">
      <div class="app-icon-image">
        <font-awesome-icon icon="gamepad" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('miniGame') }}</div>
    </div>

<<<<<<< Updated upstream
    <div class="desktop-only app-icon" @click="openApp('guestbook')">
      <div class="app-icon-image">
        <font-awesome-icon icon="book" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('guestbook') }}</div>
    </div>

        <div class="desktop-only app-icon" @click="openApp('certificates')">
      <div class="app-icon-image">
        <font-awesome-icon icon="certificate" class="app-icon-inner" />
      </div>
      <div class="app-icon-text">{{ $t('certificates') }}</div>
    </div>

=======
>>>>>>> Stashed changes
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