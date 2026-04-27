import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev server binding:
 * - Default `localhost` can make Node listen on IPv4 only while Chrome resolves
 *   `localhost` to IPv6 first → ERR_CONNECTION_REFUSED.
 * - `host: true` listens on 0.0.0.0 (all IPv4 interfaces), which fixes WSL port
 *   forwarding and many Windows setups.
 * - We also log http://127.0.0.1:PORT/ so you can bypass flaky `localhost`.
 */
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-url-hint',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          const addr = server.httpServer?.address()
          if (addr && typeof addr === 'object') {
            const port = addr.port
            console.log(
              `\n  If localhost refuses in the browser, open:\n  http://127.0.0.1:${port}/\n`,
            )
          }
        })
      },
    },
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: false,
  },
})
