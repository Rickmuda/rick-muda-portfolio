// Default skill tree, bundled with the site. SkillTree.vue reads it through
// src/contentStore.js, which the admin panel can override.
//
// x/y are positions on a 1000 x 600 canvas. `label`/`desc` may be a plain
// string or { en, nl }. `connections` are ids of skills a line is drawn to.

export const categories = [
  { id: "frontend", label: "Front-End", color: "#9b20b7" },
  { id: "backend", label: "Back-End", color: "#4361ee" },
  { id: "design", label: "Design", color: "#ff6b9d" },
  { id: "gamedev", label: "Game Dev", color: "#ff9f1c" },
  { id: "tooling", label: "Tooling", color: "#06d6a0" },
];

export const skills = [
  // Front-end (center spine)
  { id: "html", name: "HTML / CSS", category: "frontend", level: 5, x: 500, y: 95, connections: ["js", "scss"], desc: "Solid foundation, semantic-first. 5+ years of pixel-pushing." },
  { id: "js", name: "JavaScript", category: "frontend", level: 5, x: 500, y: 230, connections: ["vue", "ts"], desc: "Daily driver. ES modules, async patterns, the whole toolkit." },
  { id: "scss", name: "SCSS", category: "frontend", level: 4, x: 370, y: 170, connections: [], desc: "Mixins, nesting, the works. Still partial to vanilla CSS though." },
  { id: "ts", name: "TypeScript", category: "frontend", level: 3, x: 630, y: 170, connections: [], desc: "Comfortable for medium projects, still learning the deep generic magic." },
  { id: "vue", name: "Vue 3", category: "frontend", level: 5, x: 500, y: 360, connections: ["vrouter"], desc: "Specialty framework. Composition API, SFC patterns, you name it." },
  { id: "vrouter", name: "Vue Router", category: "frontend", level: 4, x: 620, y: 410, connections: [], desc: "SPA navigation, nested routes, guards." },

  // Back-end (left)
  { id: "laravel", name: "Laravel", category: "backend", level: 4, x: 190, y: 140, connections: ["mysql"], desc: "Used for Undertale Laravel, Webshop, plus school work." },
  { id: "mysql", name: "MySQL", category: "backend", level: 4, x: 130, y: 270, connections: [], desc: "Schema design, joins, indexing basics." },
  { id: "node", name: "Node.js", category: "backend", level: 3, x: 210, y: 390, connections: [], desc: "Build scripts, dependency tooling, basic API work." },

  // Design (top-right)
  { id: "figma", name: "Figma", category: "design", level: 4, x: 790, y: 130, connections: [], desc: "Wireframes, components, prototypes." },
  { id: "photoshop", name: "Photoshop", category: "design", level: 4, x: 860, y: 250, connections: [], desc: "Used for all gallery artwork, photo edits." },

  // Game-dev (right middle)
  { id: "gamejs", name: "Game JS / Canvas", category: "gamedev", level: 4, x: 810, y: 380, connections: [], desc: "Whack-a-Mom, Undertale Sudoku, mini-games. Pure canvas + JS." },

  // Tooling (bottom)
  { id: "git", name: "Git / GitHub", category: "tooling", level: 5, x: 500, y: 480, connections: ["vite"], desc: "Daily. Branching, rebasing, PR workflow." },
  { id: "vite", name: "Vite", category: "tooling", level: 4, x: 370, y: 510, connections: [], desc: "Used in this very portfolio. HMR is religion." },
  { id: "remix", name: "Remix", category: "tooling", level: 3, x: 660, y: 510, connections: [], desc: "Long Video Theater taught me a lot about loaders & actions." },
];
