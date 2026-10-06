// Default (non-project) art photos, bundled with the site. Components read
// them through src/contentStore.js, which the admin panel can override.

const img = (file) => `bundled:art/${file}`;

export const galleryImages = [
  { src: img("room.webp"),   name: "room" },
  { src: img("pose.webp"),   name: "pose" },
  { src: img("pepe.webp"),   name: "pepe" },
  { src: img("vtuber.webp"), name: "vtuber" },
  { src: img("fnf.webp"),    name: "fnf" },
  { src: img("panels.webp"), name: "panels" },
  { src: img("swag.webp"),   name: "swag" },
  { src: img("dance.gif"),   name: "dance" },
];
