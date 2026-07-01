import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  // Expose the dev-server root so click-to-agent can resolve webpack://
  // and root-relative source-map paths for "Go to source".
  source: {
    define: {
      __PROJECT_ROOT__: JSON.stringify(process.cwd()),
    },
  },
  server: {
    port: 5275,
  },
});
