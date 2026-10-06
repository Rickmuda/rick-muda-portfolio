<template>
  <div class="skill-tree">
    <div class="tree-header">
      <div class="legend">
        <span v-for="cat in categories" :key="cat.id" class="legend-item">
          <span class="legend-dot" :style="{ background: cat.color }"></span>
          {{ cat.label }}
        </span>
      </div>
    </div>

    <div class="tree-canvas-wrap">
      <svg
        class="tree-canvas"
        :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(155, 32, 183, 0.08)" stroke-width="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridPattern)" />

        <line
          v-for="(line, idx) in connectionLines"
          :key="`line-${idx}`"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
          :stroke="line.color"
          :stroke-width="line.active ? 2.5 : 1.5"
          :opacity="line.active ? 0.85 : 0.35"
        />

        <g
          v-for="skill in skills"
          :key="skill.id"
          :transform="`translate(${skill.x}, ${skill.y})`"
          class="node-group"
          @mouseenter="hoveredId = skill.id"
          @mouseleave="hoveredId = null"
        >
          <circle
            :r="nodeRadius(skill)"
            :fill="categoryColor(skill.category)"
            :stroke="hoveredId === skill.id ? '#fff' : '#1a1024'"
            :stroke-width="hoveredId === skill.id ? 3 : 2"
            :class="{ pulse: skill.level === 5 }"
          />
          <text
            text-anchor="middle"
            dominant-baseline="central"
            class="node-label"
            :y="nodeRadius(skill) + 16"
          >
            {{ skill.name }}
          </text>
        </g>
      </svg>

      <div v-if="hoveredSkill" class="tooltip" :style="tooltipStyle">
        <div class="tooltip-name">{{ hoveredSkill.name }}</div>
        <div class="tooltip-category">
          <span class="tooltip-category-dot" :style="{ background: categoryColor(hoveredSkill.category) }"></span>
          {{ categoryLabel(hoveredSkill.category) }}
        </div>
        <div class="tooltip-level">
          <span v-for="n in 5" :key="n" class="level-pip" :class="{ filled: n <= hoveredSkill.level }"></span>
        </div>
        <p class="tooltip-desc">{{ hoveredSkill.desc }}</p>
      </div>
    </div>

    <!-- Mobile: readable categorized list instead of the SVG graph -->
    <div class="tree-mobile-list">
      <section v-for="cat in categoriesWithSkills" :key="cat.id" class="tree-cat">
        <h3 class="tree-cat-header">
          <span class="legend-dot" :style="{ background: cat.color }"></span>
          {{ cat.label }}
        </h3>
        <div v-for="skill in cat.skills" :key="skill.id" class="skill-card">
          <div class="skill-card-top">
            <span class="skill-card-name">{{ skill.name }}</span>
            <span class="skill-card-level">
              <span
                v-for="n in 5"
                :key="n"
                class="level-pip"
                :class="{ filled: n <= skill.level }"
              ></span>
            </span>
          </div>
          <p class="skill-card-desc">{{ skill.desc }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { skillTree, localizedText } from '../../contentStore';

export default {
  data() {
    return {
      hoveredId: null,
      canvasWidth: 1000,
      canvasHeight: 600,
    };
  },
  computed: {
    // Skills/categories live in src/skillsData.js / the admin panel (via
    // src/contentStore.js); labels and descriptions may be { en, nl }.
    categories() {
      return skillTree().categories.map((c) => ({ ...c, label: localizedText(c.label) }));
    },
    skills() {
      return skillTree().skills.map((s) => ({ ...s, desc: localizedText(s.desc) }));
    },
    skillIndex() {
      return Object.fromEntries(this.skills.map(s => [s.id, s]));
    },
    connectionLines() {
      const lines = [];
      this.skills.forEach(skill => {
        (skill.connections || []).forEach(targetId => {
          const target = this.skillIndex[targetId];
          if (!target) return;
          const active = this.hoveredId === skill.id || this.hoveredId === targetId;
          lines.push({
            x1: skill.x,
            y1: skill.y,
            x2: target.x,
            y2: target.y,
            color: this.categoryColor(skill.category),
            active,
          });
        });
      });
      return lines;
    },
    hoveredSkill() {
      return this.hoveredId ? this.skillIndex[this.hoveredId] : null;
    },
    categoriesWithSkills() {
      return this.categories
        .map((cat) => ({
          ...cat,
          skills: this.skills.filter((s) => s.category === cat.id),
        }))
        .filter((cat) => cat.skills.length);
    },
    tooltipStyle() {
      if (!this.hoveredSkill) return {};
      const xPercent = (this.hoveredSkill.x / this.canvasWidth) * 100;
      const yPercent = (this.hoveredSkill.y / this.canvasHeight) * 100;
      const placeRight = xPercent < 70;
      return {
        left: placeRight ? `calc(${xPercent}% + 30px)` : 'auto',
        right: placeRight ? 'auto' : `calc(${100 - xPercent}% + 30px)`,
        top: `calc(${yPercent}% - 40px)`,
      };
    },
  },
  methods: {
    nodeRadius(skill) {
      return 14 + skill.level * 3;
    },
    categoryColor(catId) {
      const cat = this.categories.find(c => c.id === catId);
      return cat ? cat.color : '#888';
    },
    categoryLabel(catId) {
      const cat = this.categories.find(c => c.id === catId);
      return cat ? cat.label : catId;
    },
  },
};
</script>

<style scoped>
.skill-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #14081e 0%, #0a040f 100%);
  font-family: 'PortfolioFont', sans-serif;
  color: #fff;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
  letter-spacing: 0;
}

.tree-header {
  padding: 12px 20px;
  background: linear-gradient(90deg, #2a1240, #4a1d6e);
  border-bottom: 2px solid #9b20b7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.tree-canvas-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.tree-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.node-group {
  cursor: pointer;
}

.node-label {
  font-size: 11px;
  fill: #fff;
  stroke: #000;
  stroke-width: 2.5px;
  paint-order: stroke fill;
  stroke-linejoin: round;
  font-family: 'PortfolioFont', sans-serif;
  pointer-events: none;
}

circle.pulse {
  filter: drop-shadow(0 0 6px currentColor);
}

/* Tooltip */
.tooltip {
  position: absolute;
  width: 220px;
  background: rgba(20, 8, 30, 0.96);
  border: 1px solid #9b20b7;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
  pointer-events: none;
  z-index: 10;
}

.tooltip-name {
  font-size: 14px;
  margin-bottom: 2px;
}

.tooltip-category {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  margin-bottom: 8px;
}

.tooltip-category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.tooltip-level {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.level-pip {
  width: 18px;
  height: 6px;
  background: rgba(155, 32, 183, 0.2);
  border-radius: 1px;
}

.level-pip.filled {
  background: #9b20b7;
  box-shadow: 0 0 4px rgba(155, 32, 183, 0.7);
}

.tooltip-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

/* Mobile list view (hidden on desktop) */
.tree-mobile-list {
  display: none;
}

@media (max-width: 768px) {
  .tree-canvas-wrap {
    display: none;
  }

  .tree-mobile-list {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
    padding: 12px;
    gap: 18px;
  }

  .tree-cat {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tree-cat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(155, 32, 183, 0.4);
  }

  .skill-card {
    background: rgba(20, 8, 30, 0.85);
    border: 1px solid #4a1d6e;
    border-radius: 8px;
    padding: 10px 12px;
  }

  .skill-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }

  .skill-card-name {
    font-size: 14px;
    font-weight: bold;
  }

  .skill-card-level {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .skill-card-desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
  }
}
</style>
