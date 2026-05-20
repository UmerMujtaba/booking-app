const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// prevents OTEL dynamic import crash path
config.resolver.unstable_enablePackageExports = false

module.exports = config