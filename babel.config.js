module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: [
      // Decorators must come before class-properties for WatermelonDB models.
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Path aliases mirror tsconfig.json paths.
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@app': './app',
            '@db': './src/db',
            '@domain': './src/domain',
            '@ui': './src/ui',
            '@utils': './src/utils',
          },
        },
      ],
      // Reanimated plugin must be listed LAST.
      'react-native-reanimated/plugin',
    ],
  };
};
