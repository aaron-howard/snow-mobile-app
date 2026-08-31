/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  // Bump default timeout so 100-iteration fast-check property tests don't flake on CI.
  testTimeout: 15000,
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.expo/'],
  // Matches any "expo*" or "@expo*" package, plus the usual RN suspects and WatermelonDB.
  // Broader than jest-expo's default to cover packages like expo-modules-core that ship
  // untranspiled .ts in their entry paths.
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|@react-native/js-polyfills|expo[a-z-]*|@expo[a-z-]*(/.*)?|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@nozbe/watermelondb|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-gesture-handler))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@db/(.*)$': '<rootDir>/src/db/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
};
