const path = require("path");
const fs = require("fs").promises;
const AppUtils = require("../utils/AppUtils");
const config = require("../../config/config");

const MODULE_NAME = 'MediaService';

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
    const mediaDirectory = config.paths.media;

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
              relativePath: path.join(categoryName, file),
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
        displayName: AppUtils.formatDisplayText(name)
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
            await fs.mkdir(config.paths.media, { recursive: true });
            AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, `Created media directory at: ${config.paths.media}`);
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
  await scanMediaFiles();
  setInterval(scanMediaFiles, config.cache.mediaScanInterval);
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
  
  const absolutePath = path.join(config.paths.media, relativePath);
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Media path resolved', { absolutePath });
  
  return absolutePath;
};

module.exports = {
  initializeMediaService,
  getAllMedia,
  getCategories,
  getRandomMedia,
  searchMedia,
  getMediaPath
};
