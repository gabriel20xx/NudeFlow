import express from 'express';
import * as mediaService from '../services/mediaService.js';
import AppUtils from '../utils/AppUtils.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { query, buildCoreApiRouter, buildMediaInteractionRouter, buildMediaLibraryRouter } from '../../../NudeShared/server/index.js';
// TOTP and QR
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

const MODULE_NAME = 'MainAPIRoutes';
const apiRouter = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security helpers reused now from shared core router (remaining ensureAuth for media actions if needed)
function ensureAuth(req, res, next){ if (!req.session?.user?.id) return res.status(401).json({ error: 'Not authenticated' }); next(); }

// Multer storage for avatars
const avatarsDir = path.resolve(__dirname, '..', 'public', 'images', 'avatars');
try { fs.mkdirSync(avatarsDir, { recursive: true }); } catch {}
const storage = multer.diskStorage({
  destination: (req, file, cb)=> cb(null, avatarsDir),
  filename: (req, file, cb)=>{
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `u${req.session?.user?.id || 'anon'}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 2*1024*1024) } });

// Shared media library/discovery endpoints
apiRouter.use('/', buildMediaLibraryRouter({ utils: AppUtils, mediaService }));

/**
 * Saved videos endpoint (placeholder)
 */
apiRouter.get("/saved", (request, response) => {
  AppUtils.debugLog(MODULE_NAME, 'handleSavedVideosRequest', 'Processing saved videos request');
  response.json(AppUtils.createSuccessResponse([], 'Saved videos not implemented'));
});

/**
 * Random media info endpoint - returns media metadata instead of the file
 */
apiRouter.get("/media/random/:category?", (request, response) => {
  const ENDPOINT_FUNCTION = 'handleRandomMediaInfoRequest';
  let { category } = request.params;
  
  AppUtils.debugLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Processing random media info request', { category });
  
  try {
    const picked = (category == null || String(category).trim() === '') ? 'all' : (String(category).toLowerCase() === 'homepage' ? 'all' : category);
    const randomMedia = mediaService.getRandomMedia(picked);
    if (!randomMedia) {
      AppUtils.errorLog(MODULE_NAME, ENDPOINT_FUNCTION, 'No media found for the given criteria', { category });
      return response.status(404).json(AppUtils.createErrorResponse("No media found"));
    }
    const mediaInfo = { ...randomMedia, thumbnail: `/media/thumb/${randomMedia.relativePath}?w=720`, url: `/media/${randomMedia.relativePath}` };
    AppUtils.infoLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Random media info retrieved successfully', { category: picked, fileName: randomMedia.name, mediaType: randomMedia.mediaType });
    response.json(AppUtils.createSuccessResponse(mediaInfo, 'Random media info retrieved'));
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Error getting random media info', { category, error: error.message });
    response.status(500).json(AppUtils.createErrorResponse("Internal server error"));
  }
});

// Mount shared media interaction routes (like/save/state/saved)
apiRouter.use('/', buildMediaInteractionRouter(AppUtils));
