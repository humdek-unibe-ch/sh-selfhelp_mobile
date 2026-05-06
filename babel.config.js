/**
 * Babel config for the Expo SDK 55 + Reanimated 4 stack.
 *
 * Plugin order matters:
 *   1. `react-native-worklets/plugin` — must be LAST. Reanimated 4 moved
 *      its babel plugin into the worklets package; the old
 *      `react-native-reanimated/plugin` path still works but emits a
 *      deprecation warning.
 *
 * NOTE: Uniwind 1.6 dropped its babel plugin and is now wired through
 * a Metro transformer in `metro.config.js` (`withUniwindConfig`).
 */
module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ['babel-preset-expo', { jsxImportSource: 'react' }],
        ],
        plugins: [
            'react-native-worklets/plugin',
        ],
    };
};
