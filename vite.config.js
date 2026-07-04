import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { openskyProxyPlugin } from './server/openskyProxy'

export default defineConfig(({ mode }) => {
  // Load all env vars (not just VITE_-prefixed) so OPENSKY_CLIENT_ID/SECRET stay
  // server-side only, in this Node config file, never in the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), openskyProxyPlugin(env)],
  }
})
