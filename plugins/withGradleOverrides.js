const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withGradleOverrides(config) {
  return withGradleProperties(config, c => {
    const set = (key, value) => {
      const item = c.modResults.find(p => p.type === 'property' && p.key === key);
      if (item) {
        item.value = value;
      } else {
        c.modResults.push({ type: 'property', key, value });
      }
    };
    // Disable New Architecture — avoids native compilation issues on EAS free tier
    set('newArchEnabled', 'false');
    // Disable edge-to-edge — requires react-native-edge-to-edge which isn't installed
    set('edgeToEdgeEnabled', 'false');
    return c;
  });
};
