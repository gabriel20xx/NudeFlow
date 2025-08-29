import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { promises as fs } from 'fs';
import AppUtils from '../utils/AppUtils.js';
import fsSync from 'fs';

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
      // Skip hidden entries (dotfiles and dotfolders)
      if (!item || !item.name || item.name.startsWith('.')) continue;
      if (item.isDirectory()) {
        const categoryName = item.name;
        tempCategoriesCache.add(categoryName);
        const categoryPath = path.join(mediaDirectory, categoryName);

        // Recursively walk subfolders to include nested media
        const walk = async (currentDir, relativePrefix = '') => {
          let entries = [];
          try {
            entries = await fs.readdir(currentDir, { withFileTypes: true });
          } catch (e) {
            AppUtils.warnLog(MODULE_NAME, FUNCTION_NAME, 'Failed to read directory (skipping)', { currentDir, error: e.message });
            return;
          }
          for (const entry of entries) {
            if (!entry || !entry.name || entry.name.startsWith('.')) continue; // hide hidden entries at all levels
            const entryPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
              // Recurse into subfolder
              const nextPrefix = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
              await walk(entryPath, nextPrefix);
            } else {
              // File: validate and add
              if (AppUtils.validateMediaFileType(entry.name)) {
                const rel = relativePrefix ? `${categoryName}/${relativePrefix}/${entry.name}` : `${categoryName}/${entry.name}`;
                tempMediaCache.push({
                  name: path.basename(entry.name, path.extname(entry.name)),
                  filename: entry.name,
                  category: categoryName,
                  relativePath: rel,
                  mimeType: AppUtils.determineMimeType(entry.name),
                  mediaType: AppUtils.getMediaType(entry.name)
                });
              }
            }
          }
        };

        await walk(categoryPath);
      }
    }

    // Add synthetic 'all' category aggregating all subfolders (no root files)
    if (tempCategoriesCache.size > 0) {
      tempCategoriesCache.add('all');
    }

  mediaCache = tempMediaCache;
  categoriesCache = Array.from(tempCategoriesCache).map(name => ({
        name,
        // Preserve original folder casing for display
        displayName: name
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
  if (!fsSync.existsSync(mediaDir)) {
      AppUtils.warnLog(MODULE_NAME, FUNCTION_NAME, 'Media directory missing at startup (will create & remain empty)', { mediaDir });
      await fs.mkdir(mediaDir, { recursive: true });
    }
    else {
      try {
        const sample = (await fs.readdir(mediaDir)).slice(0,5);
        AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Media directory present', { mediaDir, sampleEntries: sample });
      } catch (lsErr) {
        AppUtils.warnLog(MODULE_NAME, FUNCTION_NAME, 'Could not list media dir contents', { mediaDir, error: lsErr.message });
      }
    }
  } catch (dirErr) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Failed during media directory validation', dirErr);
  }
  await scanMediaFiles();
  if (process.env.NODE_ENV !== 'test') {
    setInterval(scanMediaFiles, MEDIA_SCAN_INTERVAL);
  }
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
    const lc = String(category).toLowerCase();
    if (lc === 'all') {
      // Any item that belongs to a subfolder (has a slash in relativePath)
      filteredMedia = mediaCache.filter(item => item && typeof item.relativePath === 'string' && item.relativePath.includes('/'));
    } else {
      // Category-specific: include nested subfolders (items keep top-level category field)
      filteredMedia = mediaCache.filter(item => item.category.toLowerCase() === lc);
    }
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

  // Primary resolution
  const primaryBase = getMediaDirectory();
  let absolutePath = path.resolve(primaryBase, relativePath);
  // fsSync imported at top

  // If file missing, attempt fallback bases (helps when MEDIA_PATH was misconfigured e.g. '/media' in Windows env)
  if (!fsSync.existsSync(absolutePath)) {
    const fallbackBases = [
      path.resolve(PROJECT_ROOT, '../media'),           // sibling to project (documented default)
      path.join(PROJECT_ROOT, 'media'),                 // inside project (legacy)
      path.resolve(process.cwd(), 'media')              // current working directory
    ].filter((p, idx, arr) => arr.indexOf(p) === idx); // unique

    for (const base of fallbackBases) {
      const candidate = path.resolve(base, relativePath);
      if (fsSync.existsSync(candidate)) {
        AppUtils.warnLog(MODULE_NAME, FUNCTION_NAME, 'Primary media path missing; using fallback', { primaryBase, chosenFallbackBase: base, relativePath });
        absolutePath = candidate;
        break;
      }
    }
  }

  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Media path resolved', { absolutePath, exists: fsSync.existsSync(absolutePath) });
  return absolutePath;
};

/**
 * Get the base media directory path for security checks.
 * @returns {string} - The absolute path to the media directory.
 */
const getMediaBasePath = () => getMediaDirectory();

export {
  initializeMediaService,
  getAllMedia,
  getCategories,
  getRandomMedia,
  searchMedia,
  getMediaPath,
  getMediaBasePath
};
