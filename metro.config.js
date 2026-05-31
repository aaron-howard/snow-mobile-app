// Metro config for Expo + WatermelonDB.
// WatermelonDB ships its own JSI bridge; Metro needs to resolve its native module path.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure @nozbe/watermelondb's .ts files are resolved (its package ships untranspiled).
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts ?? []), 'ts', 'tsx', 'mjs'])
);

module.exports = config;
