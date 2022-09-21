import { all } from '@projectsophon/workspace';
import react from '@vitejs/plugin-react';
import esbuild from 'esbuild';
import fs from 'fs/promises';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const tsconfigRaw = await fs.readFile('./tsconfig.json', 'utf-8');
  const privateWorkspaces = ['circuits', 'client', 'eth'];

  return {
    // TODO: Rework this in the future - it is only here to have the old webpack parity
    mode: env.NODE_ENV ?? mode,
    assetsInclude: ['**/*.zkey'],
    plugins: [
      react(),
      // Custom plugin for transpiling files in `embedded_plugins` and converting them to strings of source code
      {
        name: 'embedded-plugins',
        enforce: 'pre',
        async transform(code, id) {
          if (!id.includes('embedded_plugins')) {
            return null;
          }

          const result = await esbuild.transform(code, { loader: 'ts', tsconfigRaw });

          return {
            code: `export default ${JSON.stringify(result.code.trim())};`,
          };
        },
      },
    ],
    server: {
      host: 'localhost',
      port: 8081,
    },
    envPrefix: 'DF_',
    clearScreen: false,
    optimizeDeps: {
      include: Array.from(all().keys()).filter((name) => !privateWorkspaces.includes(name)),
    },
  };
});
