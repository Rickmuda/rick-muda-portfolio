<template>
  <div class="start-menu">
    <div class="start-menu-topbar">{{ $t('startMenu') }}</div>
    <div class="start-menu-content">
      <p>{{ $t('startMenuIntro') }}</p>
      <p>{{ $t('currentVersion') }}: {{ commitSummary }}</p>
      <p>{{ commitDescription }}</p>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    commitSummary: { type: String, required: true },
    commitDescription: { type: String, required: true },
  },
};
</script>