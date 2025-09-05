import express from 'express';
import * as mediaService from '../services/mediaService.js';
import AppUtils from '../utils/AppUtils.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { query } from '../../../NudeShared/server/index.js';
// TOTP and QR
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

const MODULE_NAME = 'MainAPIRoutes';
const apiRouter = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Security helpers ---
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(':');
    const check = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
  } catch { return false; }
}
const normEmail = (e)=>String(e||'').trim().toLowerCase();
const validEmail=(e)=>/.+@.+\..+/.test(normEmail(e));
const validPassword=(p)=>String(p||'').length>=6;
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

/**
 * Search endpoint for media content
 */
apiRouter.get("/search", (request, response) => {
  const ENDPOINT_FUNCTION = 'handleSearchRequest';
  const searchQuery = request.query.q;
  
  AppUtils.debugLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Processing search request', { searchQuery });
  
  if (!searchQuery) {
    return response.json(AppUtils.createSuccessResponse([], 'No search query provided'));
  }

  const searchResults = mediaService.searchMedia(searchQuery);
  const formattedResults = searchResults.map(item => ({
    ...item,
    thumbnail: `/media/thumb/${item.relativePath}?w=360`,
    url: `/media/${item.relativePath}`
  }));

  AppUtils.infoLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Search completed successfully', { 
    resultsCount: formattedResults.length 
  });
  
  response.json(AppUtils.createSuccessResponse(formattedResults, 'Search results retrieved'));
});

/**
 * Categories listing endpoint
 */
apiRouter.get("/categories", (request, response) => {
  const ENDPOINT_FUNCTION = 'handleCategoriesRequest';
  AppUtils.debugLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Processing categories request');
  
  const categories = (mediaService.getCategories() || []).filter(c => c && c.name && !c.name.startsWith('.'));
  
  AppUtils.infoLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Categories retrieved successfully', { 
    categoryCount: categories.length 
  });
  
  response.json(AppUtils.createSuccessResponse(categories, 'Categories retrieved'));
});

/**
 * Routes listing endpoint - returns available categories as routes
 */
apiRouter.get("/routes", (request, response) => {
  const ENDPOINT_FUNCTION = 'handleRoutesRequest';
  AppUtils.debugLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Processing routes request');
  
  const categories = (mediaService.getCategories() || []).filter(c => c && c.name && !c.name.startsWith('.'));
  const routes = categories.map(category => category.name);
  
  AppUtils.infoLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Routes retrieved successfully', { 
    routeCount: routes.length 
  });
  
  response.json(AppUtils.createSuccessResponse(routes, 'Routes retrieved'));
});

/**
 * Category-specific videos endpoint
 */
apiRouter.get("/categories/:categoryName", (request, response) => {
  const ENDPOINT_FUNCTION = 'handleCategoryVideosRequest';
  const { categoryName } = request.params;
  
  AppUtils.debugLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Fetching videos for category', { categoryName });
  
  // Include all items under the top-level category, including nested subfolders
  const categoryMedia = mediaService.getAllMedia().filter(item => {
    if(!item || !item.category) return false;
    return item.category.toLowerCase() === categoryName.toLowerCase();
  });

  const formattedMedia = categoryMedia.map(item => ({
    ...item,
    thumbnail: `/media/thumb/${item.relativePath}?w=360`,
    url: `/media/${item.relativePath}`
  }));

  AppUtils.infoLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Category videos retrieved successfully', { 
    categoryName,
    videoCount: formattedMedia.length 
  });
  
  response.json(AppUtils.createSuccessResponse(formattedMedia, 'Category videos retrieved'));
});

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
    // Default and legacy mapping: homepage -> all
    const picked = (category == null || String(category).trim() === '') ? 'all' : (String(category).toLowerCase() === 'homepage' ? 'all' : category);
    const randomMedia = mediaService.getRandomMedia(picked);
    
    if (!randomMedia) {
      AppUtils.errorLog(MODULE_NAME, ENDPOINT_FUNCTION, 'No media found for the given criteria', { category });
      return response.status(404).json(AppUtils.createErrorResponse("No media found"));
    }
    
    const mediaInfo = {
      ...randomMedia,
      thumbnail: `/media/thumb/${randomMedia.relativePath}?w=720`,
      url: `/media/${randomMedia.relativePath}`
    };
    
    AppUtils.infoLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Random media info retrieved successfully', { 
      category: picked,
      fileName: randomMedia.name,
      mediaType: randomMedia.mediaType 
    });
    
    response.json(AppUtils.createSuccessResponse(mediaInfo, 'Random media info retrieved'));
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, ENDPOINT_FUNCTION, 'Error getting random media info', { 
      category, 
      error: error.message 
    });
    response.status(500).json(AppUtils.createErrorResponse("Internal server error"));
  }
});

/**
 * User profile retrieval endpoint (placeholder)
 */
// Profile: GET returns current user if logged in; otherwise anonymous shell
apiRouter.get('/profile', async (req, res) => {
  try {
    const uid = req.session?.user?.id;
    if (!uid) {
      return res.json(AppUtils.createSuccessResponse({ username: 'Anonymous', bio: 'No bio yet.', mfaEnabled: false }, 'Profile retrieved'));
    }
    const { rows } = await query('SELECT id, email, username, bio, avatar_url, mfa_enabled FROM users WHERE id=$1', [uid]);
    const u = rows?.[0];
    if (!u) return res.json(AppUtils.createSuccessResponse({ username: 'Anonymous', bio: 'No bio yet.', mfaEnabled: false }, 'Profile retrieved'));
    const profile = { id: u.id, email: u.email, username: u.username || 'Anonymous', bio: u.bio || '', profilePicture: u.avatar_url || '/images/default-avatar.png', mfaEnabled: !!u.mfa_enabled };
    return res.json(AppUtils.createSuccessResponse(profile, 'Profile retrieved'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'profile:get', 'Failed to fetch profile', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed to load profile'));
  }
});

// Profile update (username, email, bio)
apiRouter.put('/profile', ensureAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { username, email, bio } = req.body || {};
    const fields = [];
    const values = [];
    if (typeof username === 'string') { fields.push('username'); values.push(username.trim()); }
    if (typeof bio === 'string') { fields.push('bio'); values.push(bio.trim()); }
    if (typeof email === 'string') {
      const e = normEmail(email);
      if (!validEmail(e)) return res.status(400).json(AppUtils.createErrorResponse('Invalid email'));
      // Ensure unique email
      const { rows: existing } = await query('SELECT id FROM users WHERE email=$1 AND id<>$2', [e, uid]);
      if (existing && existing.length) return res.status(409).json(AppUtils.createErrorResponse('Email already in use'));
      fields.push('email'); values.push(e);
    }
    if (!fields.length) return res.json(AppUtils.createSuccessResponse({}, 'No changes'));
    const sets = fields.map((f, i)=>`${f}=$${i+1}`).join(', ');
    await query(`UPDATE users SET ${sets} WHERE id=$${fields.length+1}`, [...values, uid]);
    if (fields.includes('email')) { req.session.user.email = values[fields.indexOf('email')]; }
    return res.json(AppUtils.createSuccessResponse({}, 'Profile updated'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'profile:put', 'Failed to update profile', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed to update profile'));
  }
});

// Change password
apiRouter.post('/profile/password', ensureAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { currentPassword, newPassword } = req.body || {};
    if (!validPassword(newPassword)) return res.status(400).json(AppUtils.createErrorResponse('New password too short'));
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [uid]);
    const row = rows?.[0];
    if (!row || !verifyPassword(currentPassword || '', row.password_hash)) return res.status(401).json(AppUtils.createErrorResponse('Current password incorrect'));
    const pw = hashPassword(newPassword);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [pw, uid]);
    return res.json(AppUtils.createSuccessResponse({}, 'Password updated'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'profile:password', 'Failed to change password', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed to change password'));
  }
});

// Upload avatar
apiRouter.post('/profile/avatar', ensureAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json(AppUtils.createErrorResponse('No file uploaded'));
    const uid = req.session.user.id;
    const rel = `/images/avatars/${req.file.filename}`;
    await query('UPDATE users SET avatar_url=$1 WHERE id=$2', [rel, uid]);
    return res.json(AppUtils.createSuccessResponse({ profilePicture: rel }, 'Avatar updated'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'profile:avatar', 'Failed to upload avatar', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed to upload avatar'));
  }
});

// MFA TOTP: initiate -> returns otpauth and QR image data
apiRouter.get('/security/totp/initiate', ensureAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    // If already enabled, rotate a new secret for re-setup
    const secret = authenticator.generateSecret();
    const service = process.env.SITE_TITLE || 'NudeFlow';
    const label = `${service}:${req.session.user.email || 'user'}`;
    const otpauth = authenticator.keyuri(label, service, secret);
    const qr = await qrcode.toDataURL(otpauth);
    req.session.pendingTotp = { uid, secret };
    return res.json(AppUtils.createSuccessResponse({ otpauth, qr }, 'TOTP initiated'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'totp:initiate', 'Failed to initiate TOTP', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed'));
  }
});

// Verify and enable TOTP
apiRouter.post('/security/totp/verify', ensureAuth, async (req, res) => {
  try {
    const { token } = req.body || {};
    const pend = req.session.pendingTotp;
    if (!pend || pend.uid !== req.session.user.id) return res.status(400).json(AppUtils.createErrorResponse('No pending setup'));
    const ok = authenticator.check(String(token || ''), pend.secret);
    if (!ok) return res.status(400).json(AppUtils.createErrorResponse('Invalid code'));
    await query('UPDATE users SET totp_secret=$1, mfa_enabled=$2 WHERE id=$3', [pend.secret, true, pend.uid]);
    delete req.session.pendingTotp;
    return res.json(AppUtils.createSuccessResponse({ enabled: true }, 'MFA enabled'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'totp:verify', 'Failed to verify TOTP', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed'));
  }
});

// Disable TOTP (requires current password)
apiRouter.post('/security/totp/disable', ensureAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { currentPassword } = req.body || {};
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [uid]);
    const row = rows?.[0];
    if (!row || !verifyPassword(currentPassword || '', row.password_hash)) return res.status(401).json(AppUtils.createErrorResponse('Current password incorrect'));
    await query('UPDATE users SET totp_secret=NULL, mfa_enabled=$1 WHERE id=$2', [false, uid]);
    return res.json(AppUtils.createSuccessResponse({ enabled: false }, 'MFA disabled'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'totp:disable', 'Failed to disable TOTP', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed'));
  }
});

export default apiRouter;
// --- Media like/save endpoints ---
apiRouter.get('/media/state', async (req, res) => {
  try {
    const uid = req.session?.user?.id || null;
    const key = String(req.query?.mediaKey || '').trim();
    if (!key) return res.status(400).json(AppUtils.createErrorResponse('Missing mediaKey'));
    const { rows: likeCountRows } = await query('SELECT COUNT(1) AS c FROM media_likes WHERE media_key=$1', [key]);
    const likeCount = Number(likeCountRows?.[0]?.c || 0);
    let likedByUser = false;
    let savedByUser = false;
    if (uid) {
      const { rows: l } = await query('SELECT 1 AS liked FROM media_likes WHERE user_id=$1 AND media_key=$2 LIMIT 1', [uid, key]);
      const { rows: s } = await query('SELECT 1 AS saved FROM media_saves WHERE user_id=$1 AND media_key=$2 LIMIT 1', [uid, key]);
      likedByUser = !!(l && l.length);
      savedByUser = !!(s && s.length);
    }
    return res.json(AppUtils.createSuccessResponse({ mediaKey: key, likeCount, likedByUser, savedByUser }, 'State'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'media:state', 'Failed state', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed'));
  }
});

apiRouter.post('/media/like', ensureAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { mediaKey, like } = req.body || {};
    const key = String(mediaKey || '').trim();
    if (!key) return res.status(400).json(AppUtils.createErrorResponse('Missing mediaKey'));
    if (like === true) {
      await query('INSERT INTO media_likes (user_id, media_key) VALUES ($1, $2) ON CONFLICT DO NOTHING', [uid, key]);
    } else {
      await query('DELETE FROM media_likes WHERE user_id=$1 AND media_key=$2', [uid, key]);
    }
    const { rows } = await query('SELECT COUNT(1) AS c FROM media_likes WHERE media_key=$1', [key]);
    return res.json(AppUtils.createSuccessResponse({ likeCount: Number(rows?.[0]?.c || 0), likedByUser: like === true }, 'Like updated'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'media:like', 'Failed like', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed'));
  }
});

apiRouter.post('/media/save', ensureAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { mediaKey, save } = req.body || {};
    const key = String(mediaKey || '').trim();
    if (!key) return res.status(400).json(AppUtils.createErrorResponse('Missing mediaKey'));
    if (save === true) {
      await query('INSERT INTO media_saves (user_id, media_key) VALUES ($1, $2) ON CONFLICT DO NOTHING', [uid, key]);
    } else {
      await query('DELETE FROM media_saves WHERE user_id=$1 AND media_key=$2', [uid, key]);
    }
    return res.json(AppUtils.createSuccessResponse({ savedByUser: save === true }, 'Save updated'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'media:save', 'Failed save', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed'));
  }
});

// List current user's saved items
apiRouter.get('/media/saved', ensureAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { rows } = await query('SELECT media_key, created_at FROM media_saves WHERE user_id=$1 ORDER BY created_at DESC', [uid]);
    const IMAGES = new Set(['.png','.jpg','.jpeg','.gif','.webp','.bmp','.svg']);
    const mapRow = (mk) => {
      try {
        const u = new URL(mk, req.protocol + '://' + req.get('host'));
        let p = u.pathname || mk;
        if (p.startsWith('/media/')) p = p.slice('/media/'.length);
        const rel = p.replace(/^\/+/, '');
        const url = '/media/' + rel;
        const name = decodeURIComponent(rel.split('/').pop() || 'Media');
        const thumbnail = `/media/thumb/${rel}?w=360`;
        const ext = ('.' + (name.split('.').pop() || '')).toLowerCase();
        const mediaType = IMAGES.has(ext) ? 'static' : 'video';
        return { mediaKey: mk, url, thumbnail, name, mediaType };
      } catch {
        // Fallback: return as-is
        const name = decodeURIComponent(String(mk).split('/').pop() || 'Media');
        return { mediaKey: mk, url: mk, thumbnail: mk, name, mediaType: 'video' };
      }
    };
    const out = (rows || []).map(r => mapRow(r.media_key));
    return res.json(AppUtils.createSuccessResponse(out, 'Saved list'));
  } catch (e) {
    AppUtils.errorLog(MODULE_NAME, 'media:saved:list', 'Failed list', e);
    return res.status(500).json(AppUtils.createErrorResponse('Failed'));
  }
});
