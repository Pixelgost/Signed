module.exports = function (api) {
    api.cache(true);
    return {
      presets: [
        // 1. The main preset, configured to use Expo Router for file-system routing.
        ['babel-preset-expo', { 
          module: 'expo-router', 
        }]
      ],
      plugins: [
        // ⚠️ 2. The React Native Reanimated plugin MUST be the last item in the array.
        'react-native-reanimated/plugin', 
      ],
    };
  };