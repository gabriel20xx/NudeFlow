import express from 'express';
import * as mediaService from '../services/mediaService.js';
import AppUtils from '../utils/AppUtils.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { buildMediaInteractionRouter, buildMediaLibraryRouter, buildPlaylistsRouter, buildProfileRouter } from '../../../NudeShared/server/index.js'; // Added buildProfileRouter for /api/profile contract
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
// Profile API (GET /profile, PUT /profile, etc.) – required for tests expecting /api/profile
apiRouter.use('/', buildProfileRouter({ utils: AppUtils }));

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
// Mount playlists routes (create/list/add/remove). Requires auth for mutating operations.
apiRouter.use('/', buildPlaylistsRouter(AppUtils));

// Tag add & vote endpoints (user-facing). Assumes authentication middleware provides req.session.user
import { addTagToMedia, applyTagVote, getMediaTagsWithScores } from '../../../NudeShared/server/tags/tagHelpers.js';

// List tags for a media key with scores (for dynamic reload)
apiRouter.get('/media/:mediaKey/tags', async (req, res) => {
  try {
    const mediaKey = decodeURIComponent(req.params.mediaKey || '');
    const userId = req.session?.user?.id || null;
    const tags = await getMediaTagsWithScores(mediaKey, userId);
    res.json({ ok: true, tags });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Add a tag to a media item
apiRouter.post('/media/:mediaKey/tags', async (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'auth_required' });
  try {
    const mediaKey = decodeURIComponent(req.params.mediaKey || '');
    const { tag } = req.body || {};
    const result = await addTagToMedia(mediaKey, tag, userId);
    if (!result.ok) return res.status(400).json(result);
    const tags = await getMediaTagsWithScores(mediaKey, userId);
    res.json({ ok: true, added: result.tag, tags });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Vote on a tag (direction: -1, 0, 1)
apiRouter.post('/media/:mediaKey/tags/:tag/vote', async (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'auth_required' });
  try {
    const mediaKey = decodeURIComponent(req.params.mediaKey || '');
    const tagRaw = decodeURIComponent(req.params.tag || '');
    const { direction } = req.body || {};
    const result = await applyTagVote(mediaKey, tagRaw, userId, direction);
    if (!result.ok) return res.status(400).json(result);
    const tags = await getMediaTagsWithScores(mediaKey, userId);
    res.json({ ok: true, tags });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Export router for mounting by app.js
export default apiRouter;
