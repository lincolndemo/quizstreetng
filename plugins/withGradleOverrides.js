const { withGradleProperties } = require('@expo/config-plugins');

// No overrides needed — edge-to-edge must stay enabled (Android 15 / API 35 requirement)
module.exports = function withGradleOverrides(config) {
  return withGradleProperties(config, c => c);
};
