// Patch os.availableParallelism for Node 18.5 compatibility
const os = require('os');
if (!os.availableParallelism) {
  os.availableParallelism = () => os.cpus().length;
}

const { getDefaultConfig } = require('expo/metro-config');

// Get the default Metro config
const config = getDefaultConfig(__dirname);

module.exports = config;
