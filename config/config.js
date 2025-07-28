const path = require('path');
const projectRoot = path.resolve(__dirname, '..');

// Configuration file for XXXTok application
module.exports = {
  server: {
    port: process.env.PORT || 3000,
    baseUrl: process.env.BASE_URL || "http://localhost:3000"
  },
  paths: {
    root: projectRoot,
    media: process.env.MEDIA_PATH || path.join(projectRoot, 'media'),
    models: process.env.MODELS_PATH || path.join(projectRoot, 'models')
  },
  security: {
    allowedFileTypes: ['.mp4', '.webp', '.jpg', '.jpeg', '.png', '.gif'],
    maxFileSize: 50 * 1024 * 1024, // 50MB for video files
    corsOrigin: process.env.CORS_ORIGIN || "*"
  },
  features: {
    enableDynamicRoutes: process.env.ENABLE_DYNAMIC_ROUTES !== "false",
    enableSearch: process.env.ENABLE_SEARCH !== "false",
    enableProfiles: process.env.ENABLE_PROFILES !== "false"
  },
  cache: {
    mediaScanInterval: 1000 * 60 * 5 // 5 minutes
  }
};
