import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN ?? process.env.SENTRY_AUTH_TOKEN
  const sentryOrg = env.SENTRY_ORG ?? process.env.SENTRY_ORG
  const sentryProject = env.SENTRY_PROJECT ?? process.env.SENTRY_PROJECT

  const plugins = [react()]

  if (sentryAuthToken && sentryOrg && sentryProject) {
    plugins.push(
      sentryVitePlugin({
        authToken: sentryAuthToken,
        org: sentryOrg,
        project: sentryProject,
      }),
    )
  }

  return {
    plugins,
    server: {
      host: true,
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            ui: ['lucide-react', 'zustand'],
          },
        },
      },
    },
  }
})
