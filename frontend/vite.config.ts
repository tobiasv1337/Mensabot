import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      useCredentials: true,
      manifest: {
        name: 'Mensabot',
        short_name: 'Mensabot',
        description: 'Mensabot - Mensa infos and chat assistant.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F9FAFB',
        theme_color: '#FE413C',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{css,html,js,jpeg,png,svg,webmanifest}'],
      },
    }),
  ],
  envDir: "../",
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
