// Post-build step: generates the Workbox service worker against the real
// client output (.output/public), which Nitro emits after `vite build`.
// Run automatically via `npm run build`.
import { generateSW } from "workbox-build";

const { count, size, warnings } = await generateSW({
  globDirectory: ".output/public",
  globPatterns: [
    "**/*.{js,css,html,png,svg,ico,webmanifest,json,woff,woff2,ttf,otf}",
  ],
  globIgnores: ["sw.js", "registerSW.js", "_headers", "**/*.map"],
  swDest: ".output/public/sw.js",
  navigateFallback: "/offline.html",
  navigateFallbackDenylist: [/^\/api\//, /\/auth\//],
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(lovable\.cloud|supabase\.co)\//,
      handler: "NetworkFirst",
      options: {
        cacheName: "scu-api-cache",
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
      handler: "CacheFirst",
      options: {
        cacheName: "scu-fonts-cache",
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff2?|ttf|otf)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "scu-static-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "scu-images-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

for (const w of warnings) console.warn("workbox:", w);
console.log(`sw.js written — ${count} precached files, ${(size / 1024).toFixed(0)} KiB`);
