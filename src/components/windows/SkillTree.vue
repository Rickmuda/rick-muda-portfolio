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
  </div>
</template>

<script>
export default {
  data() {
    return {
      hoveredId: null,
      canvasWidth: 1000,
      canvasHeight: 600,
      categories: [
        { id: 'frontend', label: 'Front-End', color: '#9b20b7' },
        { id: 'backend', label: 'Back-End', color: '#4361ee' },
        { id: 'design', label: 'Design', color: '#ff6b9d' },
        { id: 'gamedev', label: 'Game Dev', color: '#ff9f1c' },
        { id: 'tooling', label: 'Tooling', color: '#06d6a0' },
      ],
      skills: [
        // Front-end (center spine)
        { id: 'html', name: 'HTML / CSS', category: 'frontend', level: 5, x: 500, y: 95, connections: ['js', 'scss'], desc: 'Solid foundation, semantic-first. 5+ years of pixel-pushing.' },
        { id: 'js', name: 'JavaScript', category: 'frontend', level: 5, x: 500, y: 230, connections: ['vue', 'ts'], desc: 'Daily driver. ES modules, async patterns, the whole toolkit.' },
        { id: 'scss', name: 'SCSS', category: 'frontend', level: 4, x: 370, y: 170, connections: [], desc: 'Mixins, nesting, the works. Still partial to vanilla CSS though.' },
        { id: 'ts', name: 'TypeScript', category: 'frontend', level: 3, x: 630, y: 170, connections: [], desc: 'Comfortable for medium projects, still learning the deep generic magic.' },
        { id: 'vue', name: 'Vue 3', category: 'frontend', level: 5, x: 500, y: 360, connections: ['vrouter'], desc: 'Specialty framework. Composition API, SFC patterns, you name it.' },
        { id: 'vrouter', name: 'Vue Router', category: 'frontend', level: 4, x: 620, y: 410, connections: [], desc: 'SPA navigation, nested routes, guards.' },

        // Back-end (left)
        { id: 'laravel', name: 'Laravel', category: 'backend', level: 4, x: 190, y: 140, connections: ['mysql'], desc: 'Used for Undertale Laravel, Webshop, plus school work.' },
        { id: 'mysql', name: 'MySQL', category: 'backend', level: 4, x: 130, y: 270, connections: [], desc: 'Schema design, joins, indexing basics.' },
        { id: 'node', name: 'Node.js', category: 'backend', level: 3, x: 210, y: 390, connections: [], desc: 'Build scripts, dependency tooling, basic API work.' },

        // Design (top-right)
        { id: 'figma', name: 'Figma', category: 'design', level: 4, x: 790, y: 130, connections: [], desc: 'Wireframes, components, prototypes.' },
        { id: 'photoshop', name: 'Photoshop', category: 'design', level: 4, x: 860, y: 250, connections: [], desc: 'Used for all gallery artwork, photo edits.' },

        // Game-dev (right middle)
        { id: 'gamejs', name: 'Game JS / Canvas', category: 'gamedev', level: 4, x: 810, y: 380, connections: [], desc: 'Whack-a-Mom, Undertale Sudoku, mini-games. Pure canvas + JS.' },

        // Tooling (bottom)
        { id: 'git', name: 'Git / GitHub', category: 'tooling', level: 5, x: 500, y: 480, connections: ['vite'], desc: 'Daily. Branching, rebasing, PR workflow.' },
        { id: 'vite', name: 'Vite', category: 'tooling', level: 4, x: 370, y: 510, connections: [], desc: 'Used in this very portfolio. HMR is religion.' },
        { id: 'remix', name: 'Remix', category: 'tooling', level: 3, x: 660, y: 510, connections: [], desc: 'Long Video Theater taught me a lot about loaders & actions.' },
      ],
    };
  },
  computed: {
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
</style>
