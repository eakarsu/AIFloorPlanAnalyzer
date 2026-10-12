import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const local = loadEnv(mode, '..', '')
  const demoEnabled = command === 'serve'
  const pair = demoEnabled && local.DEMO_EMAIL && local.DEMO_PASSWORD
    ? ['DEMO_EMAIL', 'DEMO_PASSWORD']
    : null
  return {
    define: {
      'import.meta.env.VITE_DEMO_EMAIL': JSON.stringify(pair ? local[pair[0]] : ''),
      'import.meta.env.VITE_DEMO_PASSWORD': JSON.stringify(pair ? local[pair[1]] : ''),
    },
    plugins: [react()],
    server: {
      port: Number(process.env.FRONTEND_PORT) || 3000,
      proxy: {
        '/api': {
          target: `http://localhost:${process.env.BACKEND_PORT || 3001}`,
          changeOrigin: true
        }
      }
    }
  }
})
