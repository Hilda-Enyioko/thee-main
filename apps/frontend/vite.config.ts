import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Do not prefix this variable with VITE_: it is only used by the local proxy.
  const env = loadEnv(mode, process.cwd(), '')
  const backendOrigin = env.BACKEND_API_ORIGIN ?? 'https://theeinsurance-backend-staging.onrender.com'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
        },
      },
    },
  }
})
