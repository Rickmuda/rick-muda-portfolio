// Shared list of the (non-project) art photos shown in the Art folder gallery.
// Consumed by PicturesGallery.vue (source='art') and the start-menu search.

const img = (file) => new URL(`./assets/img/imggallery/${file}`, import.meta.url).href;

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
