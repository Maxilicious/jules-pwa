import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Jules AI PWA',
        short_name: 'Jules',
        description: 'Google Jules AI coding assistant session manager',
        theme_color: '#131314',
        background_color: '#131314',
        display: 'standalone',
      }
    })
  ]
})
