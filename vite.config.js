import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";

// Get the latest Git commit hash, summary, and description
const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
const commitSummary = execSync("git log -1 --pretty=%s").toString().trim();
const commitDescription = execSync("git log -1 --pretty=%b").toString().trim(); // Get the commit description

export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      // We ship our own /site.webmanifest with the icons + theme color, so the
      // plugin should not generate or inject another one.
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,webp,png,svg,ttf,woff2,ico}"],
        // Skip the giant portfolio video (and any other oversized assets) so
        // the service-worker precache stays lean and installs reliably.
        globIgnores: ["**/portfoliovideo.*", "**/*.mov", "**/*.mp4"],
        maximumFileSizeToCacheInBytes: 5_000_000,
        // Runtime-cache videos on demand so they still work offline once watched.
        runtimeCaching: [
          {
            urlPattern: /\.(?:mp4|webm|mov)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "videos",
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash), // Inject the commit hash
    __COMMIT_SUMMARY__: JSON.stringify(commitSummary), // Inject the commit summary
    __COMMIT_DESCRIPTION__: JSON.stringify(commitDescription), // Inject the commit description
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
