import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Expose the dev-server root so click-to-agent can turn root-relative
  // source-map paths (e.g. /src/App.tsx) into absolute paths for "Go to source".
  define: {
    __PROJECT_ROOT__: JSON.stringify(process.cwd()),
  },
  server: {
    port: 5273,
  },
});
