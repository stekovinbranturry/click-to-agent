import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Expose the dev-server root so click-to-agent can resolve root-relative
  // source-map paths (e.g. /src/routes/index.tsx) for "Go to source".
  define: {
    __PROJECT_ROOT__: JSON.stringify(process.cwd()),
  },
  server: {
    port: 5280,
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
