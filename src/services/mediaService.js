const path = require("path");
const fs = require("fs").promises;
const AppUtils = require("../utils/AppUtils");

const MODULE_NAME = 'MediaService';

// Environment configuration
// Default media directory placed OUTSIDE project root (sibling to NudeFlow) => ../media
// Allows sharing a single media library across redeploys without touching source tree.
const MEDIA_PATH = process.env.MEDIA_PATH || '../media';
const MEDIA_SCAN_INTERVAL = parseInt(process.env.MEDIA_SCAN_INTERVAL) || 300000; // 5 minutes

// Get the project root directory (going from src/services to project root)
const PROJECT_ROOT = path.resolve(__dirname, '../../');

// Helper function to get the resolved media directory path
const getMediaDirectory = () => {
  // If MEDIA_PATH starts with ../, resolve it from project root
  // Otherwise, treat it as an absolute path or relative to project root
  if (MEDIA_PATH.startsWith('../')) {
    return path.resolve(PROJECT_ROOT, MEDIA_PATH);
  } else {
    return path.resolve(PROJECT_ROOT, MEDIA_PATH);
  }
};

let mediaCache = [];
let categoriesCache = [];

/**
 * Scans the media directory to build a cache of all media files.
 */
const scanMediaFiles = async () => {
  const FUNCTION_NAME = 'scanMediaFiles';
  AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Starting media scan...');

  try {
    const tempMediaCache = [];
    const tempCategoriesCache = new Set();
    const mediaDirectory = getMediaDirectory();

    const items = await fs.readdir(mediaDirectory, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        const categoryName = item.name;
        tempCategoriesCache.add(categoryName);
        const categoryPath = path.join(mediaDirectory, categoryName);
        const files = await fs.readdir(categoryPath);

        for (const file of files) {
          if (AppUtils.validateMediaFileType(file)) {
            tempMediaCache.push({
              name: path.basename(file, path.extname(file)),
              filename: file,
              category: categoryName,
              relativePath: `${categoryName}/${file}`, // Use forward slashes for URLs
              mimeType: AppUtils.determineMimeType(file),
              mediaType: AppUtils.getMediaType(file)
            });
          }
        }
      }
    }
    
    // Add files from root media directory to 'homepage' category
    const rootFiles = items.filter(item => item.isFile() && AppUtils.validateMediaFileType(item.name));
    if (rootFiles.length > 0) {
        tempCategoriesCache.add('homepage');
        for (const file of rootFiles) {
            tempMediaCache.push({
                name: path.basename(file.name, path.extname(file.name)),
                filename: file.name,
                category: 'homepage',
                relativePath: file.name,
                mimeType: AppUtils.determineMimeType(file.name),
                mediaType: AppUtils.getMediaType(file.name)
            });
        }
    }

    mediaCache = tempMediaCache;
    categoriesCache = Array.from(tempCategoriesCache).map(name => ({
        name,
        displayName: AppUtils.formatRouteNameForDisplay(name)
    }));

    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Media scan completed successfully', {
      filesFound: mediaCache.length,
      categoriesFound: categoriesCache.length
    });
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error during media scan', error);
    // If the directory doesn't exist, create it
    if (error.code === 'ENOENT') {
        try {
            const mediaDirectory = getMediaDirectory();
            await fs.mkdir(mediaDirectory, { recursive: true });
            AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, `Created media directory at: ${mediaDirectory}`);
        } catch (mkdirError) {
            AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Failed to create media directory', mkdirError);
        }
    }
  }
};

/**
 * Initializes the media service and starts the periodic scan.
 */
const initializeMediaService = async () => {
  const FUNCTION_NAME = 'initializeMediaService';
  // Validate external media directory presence (warn only; do not fail startup)
  try {
    const mediaDir = getMediaDirectory();
    const fsSync = require('fs');
    if (!fsSync.existsSync(mediaDir)) {
      AppUtils.warnLog(MODULE_NAME, FUNCTION_NAME, 'Media directory missing at startup (will create & remain empty)', { mediaDir });
      await fs.mkdir(mediaDir, { recursive: true });
    }
  } catch (dirErr) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Failed during media directory validation', dirErr);
  }
  await scanMediaFiles();
  setInterval(scanMediaFiles, MEDIA_SCAN_INTERVAL);
};

/**
 * Get all media files from the cache.
 * @returns {Array}
 */
const getAllMedia = () => mediaCache;

/**
 * Get all categories from the cache.
 * @returns {Array}
 */
const getCategories = () => categoriesCache;

/**
 * Get a random media item, optionally filtered by category.
 * @param {string} [category] - Optional category to filter by.
 * @returns {object|null}
 */
const getRandomMedia = (category = null) => {
  const FUNCTION_NAME = 'getRandomMedia';
  let filteredMedia = mediaCache;

  if (category) {
    filteredMedia = mediaCache.filter(item => item.category.toLowerCase() === category.toLowerCase());
  }

  if (filteredMedia.length === 0) {
    AppUtils.warnLog(MODULE_NAME, FUNCTION_NAME, 'No media found for category', { category });
    return null;
  }

  return filteredMedia[Math.floor(Math.random() * filteredMedia.length)];
};

/**
 * Search for media files by a query string.
 * @param {string} query - The search query.
 * @returns {Array}
 */
const searchMedia = (query) => {
  const sanitizedQuery = AppUtils.sanitizeUserInput(query).toLowerCase();
  if (!sanitizedQuery) return [];

  return mediaCache.filter(item =>
    item.name.toLowerCase().includes(sanitizedQuery) ||
    item.category.toLowerCase().includes(sanitizedQuery)
  );
};

/**
 * Get the absolute path for a media file based on its relative path.
 * @param {string} relativePath - The relative path of the media file.
 * @returns {string} - The absolute path to the media file.
 */
const getMediaPath = (relativePath) => {
  const FUNCTION_NAME = 'getMediaPath';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Getting absolute media path', { relativePath });
  
  if (!relativePath) {
    AppUtils.warnLog(MODULE_NAME, FUNCTION_NAME, 'No relative path provided');
    return null;
  }
  
  const absolutePath = path.resolve(getMediaDirectory(), relativePath);
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Media path resolved', { absolutePath });
  
  return absolutePath;
};

/**
 * Get the base media directory path for security checks.
 * @returns {string} - The absolute path to the media directory.
 */
const getMediaBasePath = () => getMediaDirectory();

module.exports = {
  initializeMediaService,
  getAllMedia,
  getCategories,
  getRandomMedia,
  searchMedia,
  getMediaPath,
  getMediaBasePath
};
