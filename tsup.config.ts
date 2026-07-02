import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

const USE_CLIENT_BANNER = '"use client";\n';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: true,
  treeshake: true,
  external: ['react', 'next', '@jridgewell/trace-mapping'],
  define: {
    __VERSION__: JSON.stringify(version),
  },
  onSuccess: async () => {
    const distDir = join(process.cwd(), 'dist');
    for (const file of readdirSync(distDir)) {
      if (!file.endsWith('.js') && !file.endsWith('.cjs')) continue;
      const filePath = join(distDir, file);
      const content = readFileSync(filePath, 'utf-8');
      if (!content.startsWith('"use client"')) {
        writeFileSync(filePath, USE_CLIENT_BANNER + content);
      }
    }
  },
});
