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
    // Keep edge-to-edge off to avoid layout issues with system bars in the quiz UI
    set('edgeToEdgeEnabled', 'false');
    return c;
  });
};
