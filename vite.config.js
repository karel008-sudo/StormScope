import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages deploys at https://karel008-sudo.github.io/StormScope/
// All asset URLs need this prefix; PWA manifest scope/start_url match.
const BASE = '/StormScope/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.rainviewer\.com\/public\/weather-maps\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rainviewer-meta',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/tilecache\.rainviewer\.com\/.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'rainviewer-tiles',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/[a-z0-9.]+basemaps\.cartocdn\.com\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'basemap-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Open-Meteo forecast — short-lived cache so we can render
            // a stale-but-recent forecast offline if the device drops out.
            urlPattern: /^https:\/\/api\.open-meteo\.com\/v1\/forecast.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openmeteo-forecast',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 15 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'StormScope',
        short_name: 'StormScope',
        description:
          'Your personal storm radar. Live rain, storm motion, and sky awareness around your location.',
        theme_color: '#0b0b11',
        background_color: '#0b0b11',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: BASE,
        start_url: BASE,
        categories: ['weather', 'utilities', 'navigation'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
