import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // This branch serves Chorecast, so retire the Tattoo Tycoon offline copy: devices that installed it get a
      // service worker that unregisters itself and clears its cache, instead of replaying the game for every page.
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Tattoo Tycoon',
        short_name: 'TattooTycoon',
        description: 'Build your tattoo empire from scratch.',
        theme_color: '#0a0a12',
        background_color: '#0a0a12',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
