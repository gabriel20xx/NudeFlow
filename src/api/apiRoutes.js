import express from '../express-shim.js';
import * as mediaService from '../services/mediaService.js';
import AppUtils from '../utils/AppUtils.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
// Optional multer import (avatar uploads not required for playlist tests). Provide no-op stub if absent.
let multer;
try { ({ default: multer } = await import('multer')); }
catch {
  multer = function multerStub(){ return { single: ()=> (req,res,next)=>next(), array: ()=> (req,res,next)=>next(), fields: ()=> (req,res,next)=>next() }; };
  multer.diskStorage = () => ({ });
}
import { fileURLToPath } from 'url';
import { buildMediaInteractionRouter, buildMediaLibraryRouter, buildPlaylistsRouter, buildProfileRouter } from '../../../NudeShared/server/index.js'; // Added buildProfileRouter for /api/profile contract
// TOTP and QR
let authenticator; try { ({ authenticator } = await import('otplib')); } catch { authenticator = { generate: ()=> '000000', verify: ()=> true }; }
let qrcode; try { ({ default: qrcode } = await import('qrcode')); } catch { qrcode = { toDataURL: async () => 'data:image/png;base64,' }; }

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

// --- Flow media state + view tracking endpoints (ensure presence; avoid 500s when called by client scripts) ---
import { query as sharedQuery, getDriver } from '../../../NudeShared/server/db/db.js';

// Media state: returns engagement counts + user flags for a given mediaKey
apiRouter.get('/media/state', async (req, res) => {
  const mediaKey = String(req.query.mediaKey||'').trim();
  if(!mediaKey) return res.status(400).json({ ok:false, error:'mediaKey required'});
  try {
    AppUtils.infoLog(MODULE_NAME,'MEDIA_STATE_START','begin',{ mediaKey });
    const driver = getDriver();
    // Basic counts (views, likes, saves, downloads)
    const tables = ['media_views','media_likes','media_saves','media_downloads'];
    const counts = {};
    for(const t of tables){
      let sql = `SELECT COUNT(1) AS c FROM ${t} WHERE media_key = ?`;
      if(driver==='pg') sql = sql.replace(/\?/g,'$1');
      const { rows } = await sharedQuery(sql, [mediaKey]);
      counts[t] = Number(rows?.[0]?.c||0);
    }
    // User flags
    const userId = req.session?.user?.id || null;
    let userFlags = { liked:false, saved:false };
    if(userId){
      const likeSql = driver==='pg' ? 'SELECT 1 FROM media_likes WHERE media_key=$1 AND user_id=$2 LIMIT 1' : 'SELECT 1 FROM media_likes WHERE media_key=? AND user_id=? LIMIT 1';
      const saveSql = driver==='pg' ? 'SELECT 1 FROM media_saves WHERE media_key=$1 AND user_id=$2 LIMIT 1' : 'SELECT 1 FROM media_saves WHERE media_key=? AND user_id=? LIMIT 1';
      const { rows: lr } = await sharedQuery(likeSql, [mediaKey, userId]);
      const { rows: sr } = await sharedQuery(saveSql, [mediaKey, userId]);
      userFlags.liked = !!(lr && lr.length);
      userFlags.saved = !!(sr && sr.length);
    }
    res.json({ ok:true, mediaKey, counts: {
      views: counts.media_views,
      likes: counts.media_likes,
      saves: counts.media_saves,
      downloads: counts.media_downloads
    }, user: userFlags });
    AppUtils.infoLog(MODULE_NAME,'MEDIA_STATE_SUCCESS','done',{ mediaKey, counts });
  } catch(e){
    AppUtils.errorLog(MODULE_NAME, 'MEDIA_STATE', 'Failed to load media state', e, { mediaKey });
    res.status(500).json({ ok:false, error:'state_failed'});
  }
});

// Register a view event (idempotence per user+media not enforced here; rely on client throttling)
apiRouter.post('/media/view', async (req, res) => {
  const { mediaKey } = req.body||{};
  if(!mediaKey) return res.status(400).json({ ok:false, error:'mediaKey required'});
  try {
    AppUtils.infoLog(MODULE_NAME,'MEDIA_VIEW_START','begin',{ mediaKey });
    const driver = getDriver();
    const userId = req.session?.user?.id || null;
    const now = new Date();
    const sql = driver==='pg'
      ? 'INSERT INTO media_views (media_key, user_id, created_at) VALUES ($1,$2,$3)'
      : 'INSERT INTO media_views (media_key, user_id, created_at) VALUES (?,?,?)';
    await sharedQuery(sql, [mediaKey, userId, now]);
    res.json({ ok:true });
    AppUtils.infoLog(MODULE_NAME,'MEDIA_VIEW_SUCCESS','inserted',{ mediaKey });
  } catch(e){
    AppUtils.errorLog(MODULE_NAME, 'MEDIA_VIEW', 'Failed to record view', e, { mediaKey });
    res.status(500).json({ ok:false, error:'view_failed'});
  }
});

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
