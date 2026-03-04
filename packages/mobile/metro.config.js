const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const mobileModules = path.resolve(__dirname, 'node_modules');
const rootModules = path.resolve(__dirname, '../../node_modules');

// Force ALL 'react' imports (including transitive from zustand, immer, etc.)
// to resolve to mobile's local react@19.1.0, preventing duplicate-instance hook errors.
// We use require.resolve (not path.resolve) so that react sub-paths like 'react/jsx-dev-runtime'
// are resolved to actual .js files via the package's exports map, not bare directory paths.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    try {
      return {
        filePath: require.resolve(moduleName, { paths: [__dirname] }),
        type: 'sourceFile',
      };
    } catch (_) {
      // fall through to default resolution
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Keep explicit aliases for other shared packages
config.resolver.extraNodeModules = {
  'react-native': path.resolve(rootModules, 'react-native'),
  zustand: path.resolve(rootModules, 'zustand'),
  immer: path.resolve(rootModules, 'immer'),
};

// Watch the entire monorepo so Metro can bundle @lorewalker/core source
config.watchFolders = [path.resolve(__dirname, '../..')];

module.exports = config;
