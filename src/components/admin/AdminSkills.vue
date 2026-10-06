<template>
  <section class="cms-skills">
    <div class="cms-toolbar">
      <button class="cms-btn primary" @click="addSkill">
        <font-awesome-icon icon="plus" /> {{ $t('adminSkillNew') }}
      </button>
      <span class="cms-hint">{{ $t('adminSkillHint') }}</span>
    </div>

    <div class="cms-skill-canvas-wrap">
      <svg
        ref="svg"
        class="cms-skill-canvas"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid meet"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
      >
        <line
          v-for="(line, idx) in lines"
          :key="'l' + idx"
          :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2"
          :stroke="line.color"
          stroke-width="2"
          opacity="0.6"
        />
        <g
          v-for="s in tree.skills"
          :key="s.id"
          :transform="`translate(${s.x}, ${s.y})`"
          class="cms-skill-node"
          @pointerdown.prevent="onPointerDown(s, $event)"
        >
          <circle
            :r="14 + s.level * 3"
            :fill="categoryColor(s.category)"
            :stroke="selectedId === s.id ? '#fff' : '#1a1024'"
            :stroke-width="selectedId === s.id ? 4 : 2"
          />
          <text text-anchor="middle" :y="14 + s.level * 3 + 16" class="cms-skill-label">{{ s.name }}</text>
        </g>
      </svg>
    </div>

    <div class="cms-layout">
      <div v-if="selected" class="cms-edit-col">
        <div class="cms-edit-head">
          <h3>{{ selected.name || '?' }}</h3>
          <div class="cms-row-buttons">
            <template v-if="confirmDelete">
              <button class="cms-btn danger small" @click="removeSkill">{{ $t('adminYes') }}</button>
              <button class="cms-btn small" @click="confirmDelete = false">{{ $t('adminCancel') }}</button>
            </template>
            <button v-else class="cms-icon-btn danger" :title="$t('adminDelete')" @click="confirmDelete = true">
              <font-awesome-icon icon="trash" />
            </button>
            <button class="cms-btn" @click="selectedId = null">{{ $t('adminDone') }}</button>
          </div>
        </div>
        <div class="cms-grid2">
          <label class="cms-field">
            <span>{{ $t('adminSkillName') }}</span>
            <input v-model="selected.name" class="cms-input" />
          </label>
          <label class="cms-field">
            <span>{{ $t('adminSkillCategory') }}</span>
            <select v-model="selected.category" class="cms-input">
              <option v-for="c in tree.categories" :key="c.id" :value="c.id">{{ labelOf(c) }}</option>
            </select>
          </label>
          <label class="cms-field">
            <span>{{ $t('adminSkillLevel', { n: selected.level }) }}</span>
            <input v-model.number="selected.level" type="range" min="1" max="5" step="1" />
          </label>
        </div>
        <LocalizedInput v-model="selected.desc" :label="$t('adminDescription')" multiline :rows="3" />
        <h4 class="cms-card-title">{{ $t('adminSkillConnections') }}</h4>
        <div class="cms-chip-list">
          <label v-for="s in otherSkills" :key="s.id" class="cms-check cms-chip">
            <input type="checkbox" :checked="selected.connections.includes(s.id)" @change="toggleConnection(s.id)" />
            <span>{{ s.name }}</span>
          </label>
        </div>
      </div>
      <p v-else class="cms-hint">{{ $t('adminSkillSelect') }}</p>

      <div class="cms-card">
        <h4 class="cms-card-title">{{ $t('adminSkillCategories') }}</h4>
        <div v-for="(c, i) in tree.categories" :key="c.id" class="cms-category-row">
          <input v-model="c.color" type="color" class="cms-color" :aria-label="$t('adminSkillColor')" />
          <label v-for="lang in langs" :key="lang" class="cms-inline-lang">
            <span class="cms-lang">{{ lang.toUpperCase() }}</span>
            <input v-model="c.label[lang]" class="cms-input" />
          </label>
          <button
            class="cms-icon-btn danger"
            :disabled="isCategoryUsed(c.id)"
            :title="isCategoryUsed(c.id) ? $t('adminSkillCategoryInUse') : $t('adminDelete')"
            @click="tree.categories.splice(i, 1)"
          >
            <font-awesome-icon icon="trash" />
          </button>
        </div>
        <button class="cms-btn" @click="addCategory">
          <font-awesome-icon icon="plus" /> {{ $t('adminSkillNewCategory') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { localizedText } from "../../contentStore";
import LocalizedInput from "./LocalizedInput.vue";

const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default {
  name: "AdminSkills",
  components: { FontAwesomeIcon, LocalizedInput },
  props: {
    // The admin panel's whole editable content; this tab edits draft.skills.
    draft: { type: Object, required: true },
  },
  data() {
    return {
      langs: ["en", "nl"],
      selectedId: null,
      confirmDelete: false,
      dragging: null, // { skill, dx, dy } while a node is being dragged
    };
  },
  computed: {
    tree() {
      return this.draft.skills;
    },
    selected() {
      return this.tree.skills.find((s) => s.id === this.selectedId) || null;
    },
    otherSkills() {
      return this.tree.skills.filter((s) => s.id !== this.selectedId);
    },
    lines() {
      const byId = Object.fromEntries(this.tree.skills.map((s) => [s.id, s]));
      const out = [];
      for (const s of this.tree.skills) {
        for (const id of s.connections || []) {
          const t = byId[id];
          if (t) out.push({ x1: s.x, y1: s.y, x2: t.x, y2: t.y, color: this.categoryColor(s.category) });
        }
      }
      return out;
    },
  },
  watch: {
    selectedId() {
      this.confirmDelete = false;
    },
  },
  methods: {
    labelOf(c) {
      return localizedText(c.label) || c.id;
    },
    categoryColor(id) {
      return this.tree.categories.find((c) => c.id === id)?.color || "#888";
    },
    isCategoryUsed(id) {
      return this.tree.skills.some((s) => s.category === id);
    },
    // Pointer position in the SVG's own 1000 x 600 coordinates.
    svgPoint(e) {
      const svg = this.$refs.svg;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
    },
    onPointerDown(skill, e) {
      this.selectedId = skill.id;
      const p = this.svgPoint(e);
      this.dragging = { skill, dx: skill.x - p.x, dy: skill.y - p.y };
    },
    onPointerMove(e) {
      if (!this.dragging) return;
      const p = this.svgPoint(e);
      const { skill, dx, dy } = this.dragging;
      skill.x = Math.round(Math.max(20, Math.min(980, p.x + dx)));
      skill.y = Math.round(Math.max(20, Math.min(560, p.y + dy)));
    },
    onPointerUp() {
      this.dragging = null;
    },
    addSkill() {
      const skill = {
        id: newId("s"),
        name: this.$t("adminSkillNew"),
        category: this.tree.categories[0]?.id || "",
        level: 3,
        x: 500,
        y: 300,
        connections: [],
        desc: {},
      };
      this.tree.skills.push(skill);
      this.selectedId = skill.id;
    },
    removeSkill() {
      const id = this.selectedId;
      this.tree.skills = this.tree.skills.filter((s) => s.id !== id);
      for (const s of this.tree.skills) {
        s.connections = (s.connections || []).filter((c) => c !== id);
      }
      this.selectedId = null;
    },
    toggleConnection(id) {
      const list = this.selected.connections;
      const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1);
      else list.push(id);
    },
    addCategory() {
      this.tree.categories.push({ id: newId("c"), label: { en: "", nl: "" }, color: "#9b20b7" });
    },
  },
};
</script>
