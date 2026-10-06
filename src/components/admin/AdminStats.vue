<template>
  <section class="cms-stats">
    <div class="cms-toolbar">
      <button
        v-for="d in ranges"
        :key="d"
        class="cms-tab"
        :class="{ active: days === d }"
        @click="days = d"
      >
        {{ $t('adminStatsDays', { n: d }) }}
      </button>
      <button class="cms-btn" @click="load">{{ $t('adminScoresRefresh') }}</button>
    </div>

    <div v-if="loading" class="cms-hint">{{ $t('adminLoading') }}</div>
    <div v-else-if="error" class="cms-message error">{{ $t('adminStatsError') }}</div>
    <template v-else>
      <div class="cms-stat-tiles">
        <div class="cms-stat-tile">
          <span class="cms-stat-value">{{ totals.uniques }}</span>
          <span class="cms-stat-label">{{ $t('adminStatsUniques') }}</span>
        </div>
        <div class="cms-stat-tile">
          <span class="cms-stat-value">{{ totals.visits }}</span>
          <span class="cms-stat-label">{{ $t('adminStatsVisits') }}</span>
        </div>
        <div class="cms-stat-tile">
          <span class="cms-stat-value">{{ percent(totals.mobile, totals.mobile + totals.desktop) }}</span>
          <span class="cms-stat-label">{{ $t('adminStatsMobile') }}</span>
        </div>
        <div class="cms-stat-tile">
          <span class="cms-stat-value">{{ percent(totals.lang.nl || 0, (totals.lang.nl || 0) + (totals.lang.en || 0)) }}</span>
          <span class="cms-stat-label">{{ $t('adminStatsDutch') }}</span>
        </div>
      </div>

      <h4>{{ $t('adminStatsPerDay') }}</h4>
      <div class="cms-chart" role="img" :aria-label="$t('adminStatsPerDay')">
        <div
          v-for="d in series"
          :key="d.date"
          class="cms-chart-bar"
          :title="`${formatDate(d.date)}: ${d.uniques} ${$t('adminStatsUniques').toLowerCase()}, ${d.visits} ${$t('adminStatsVisits').toLowerCase()}`"
        >
          <span class="cms-chart-fill" :style="{ height: barHeight(d.uniques) }"></span>
        </div>
      </div>
      <div class="cms-chart-axis">
        <span>{{ formatDate(series[0]?.date) }}</span>
        <span>{{ formatDate(series[series.length - 1]?.date) }}</span>
      </div>

      <h4>{{ $t('adminStatsTopApps') }}</h4>
      <p v-if="!topApps.length" class="cms-hint">{{ $t('adminStatsNoData') }}</p>
      <ol v-else class="cms-top-apps">
        <li v-for="a in topApps" :key="a.name">
          <span class="cms-top-name">{{ appLabel(a.name) }}</span>
          <span class="cms-top-bar"><span :style="{ width: (a.count / topApps[0].count) * 100 + '%' }"></span></span>
          <span class="cms-top-count">{{ a.count }}</span>
        </li>
      </ol>
      <p class="cms-hint">{{ $t('adminStatsPrivacy') }}</p>
    </template>
  </section>
</template>

<script>
import { fetchStats } from "../../contentStore";
import { windowConfig } from "../../windowConfig";
import { findNodeById } from "../../filesystem";

export default {
  name: "AdminStats",
  data() {
    return {
      ranges: [7, 30, 90],
      days: 30,
      series: [],
      loading: false,
      error: false,
    };
  },
  computed: {
    totals() {
      const t = { visits: 0, uniques: 0, mobile: 0, desktop: 0, lang: {}, apps: {} };
      for (const d of this.series) {
        t.visits += d.visits;
        t.uniques += d.uniques;
        t.mobile += d.mobile;
        t.desktop += d.desktop;
        for (const [k, v] of Object.entries(d.lang || {})) t.lang[k] = (t.lang[k] || 0) + v;
        for (const [k, v] of Object.entries(d.apps || {})) t.apps[k] = (t.apps[k] || 0) + v;
      }
      return t;
    },
    topApps() {
      return Object.entries(this.totals.apps)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    },
    maxUniques() {
      return Math.max(1, ...this.series.map((d) => d.uniques));
    },
  },
  watch: {
    days() {
      this.load();
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = false;
      const result = await fetchStats(this.days);
      this.loading = false;
      if (result === null) {
        this.error = true;
        this.series = [];
      } else {
        this.series = result;
      }
    },
    barHeight(value) {
      return value ? `${Math.max(3, (value / this.maxUniques) * 100)}%` : "0";
    },
    percent(part, whole) {
      return whole ? `${Math.round((part / whole) * 100)}%` : "-";
    },
    formatDate(value) {
      if (!value) return "";
      const d = new Date(value + "T00:00:00");
      return d.toLocaleDateString(this.$i18n.locale, { day: "numeric", month: "short" });
    },
    // Stats are keyed by window name (apps) or folder id (opened in the Explorer).
    appLabel(name) {
      const key = windowConfig[name]?.title || findNodeById(name)?.labelKey;
      return key ? this.$t(key) : name;
    },
  },
};
</script>
