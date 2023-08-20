import { all } from '@projectsophon/workspace';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import react from '@vitejs/plugin-react';
import esbuild from 'esbuild';
import { basename, dirname } from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
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

          const result = await esbuild.build({
            stdin: {
              contents: code,
              resolveDir: dirname(id),
              sourcefile: basename(id),
              loader: 'ts',
            },
            bundle: true,
            format: 'esm',
            write: false,
          });

          if (result.outputFiles.length > 1) {
            throw new Error(`Embedded plugin (${basename(id)}) generated multiple bundles`);
          }

          return {
            code: `export default ${JSON.stringify(result.outputFiles[0].text.trim())}`,
          };
        },
      },
    ],
    server: {
      host: 'localhost',
      port: 8081,
    },
    build: {
      rollupOptions: {
        plugins: [commonjs(), nodeResolve()],
      },
    },
    envPrefix: 'DF_',
    clearScreen: false,
    optimizeDeps: {
      force: true,
      include: Array.from(all().keys()).filter((name) => !privateWorkspaces.includes(name)),
    },
  };
});
