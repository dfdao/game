import { PluginId } from '@darkforest_eth/types';

/**
 * This interface represents an embedded plugin, which is stored in `embedded_plugins/`.
 */
export interface EmbeddedPlugin {
  id: PluginId;
  name: string;
  code: string;
}

/**
 * Load all of the embedded plugins in the dist directory of the `embedded_plugins/` project
 * as Plain Text files. This means that `embedded_plugins/` can't use `import` for relative paths.
 */
const pluginsContext: Record<string, { default: string }> = import.meta.glob(
  [
    '../../../embedded_plugins/**/*.ts',
    '../../../embedded_plugins/**/*.tsx',
    '../../../embedded_plugins/**/*.js',
    '../../../embedded_plugins/**/*.jsx',
  ],
  {
    eager: true,
  }
);

function flattenPath(filename: string) {
  // TODO: Remove the `./` when possible, only added for parity with the old webpack code
  return filename.replace('../../../embedded_plugins/', './');
}

function cleanFilename(filename: string) {
  return flattenPath(filename)
    .replace(/^\.\//, '')
    .replace(/[_-]/g, ' ')
    .replace(/\.[jt]sx?$/, '');
}

export function getEmbeddedPlugins(isAdmin: boolean) {
  return Object.keys(pluginsContext)
    .filter((filename) => {
      if (isAdmin) {
        return true;
      } else {
        return !filename.includes('./Admin-Controls');
      }
    })
    .map((filename) => {
      return {
        id: flattenPath(filename) as PluginId,
        name: cleanFilename(filename),
        code: pluginsContext[filename].default,
      };
    });
}
