/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon-16x16.png', 'favicon.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'logo.png'],
      manifest: {
        name: 'Tulia Bible',
        short_name: 'Tulia',
        description: 'Collaborative Bible study app',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // New SW takes control immediately instead of waiting for all tabs
        // to close — prevents users from being stuck on a broken old SW
        // after a bad deploy.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        globIgnores: ['**/bible/**'],
        // Don't try to serve the SPA shell for API paths.
        navigateFallbackDenylist: [/^\/api\//, /^\/hocuspocus\//, /^\/sanctum\//],
        runtimeCaching: [
          // Auth endpoints must NEVER be cached — caching the response of a
          // login (or even a 401) is a recipe for ghost-session bugs.
          {
            urlPattern: /\/api\/auth\//i,
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: /\/api\/auth\//i,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          // All other API calls: try network first; fall back to a short
          // cache only if the network is unreachable. Matches both the
          // local dev backend (verbum.test) and prod (tulia.study).
          {
            urlPattern: /^https:\/\/(verbum\.test|tulia\.study)\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24,
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'out',
    emptyOutDir: false,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
