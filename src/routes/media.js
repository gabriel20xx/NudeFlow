import express from 'express';
import path from 'path';
import * as mediaService from '../services/mediaService.js';
import AppUtils from '../utils/AppUtils.js';
import fs from 'fs';
import sharp from 'sharp';

const mediaRouter = express.Router();
/**
 * Lightweight thumbnail route: /media/thumb/<relativePath>?w=..&h=..
 * Generates cached JPEG thumbnails next to originals under a .thumbs directory.
 */
mediaRouter.get('/thumb/*', async (request, response) => {
    const rel = request.params[0];
    const width = Math.max(32, Math.min(2048, Number(request.query.w) || 360));
    const height = Math.max(0, Math.min(2048, Number(request.query.h) || 0));
    try {
        const decodedPath = decodeURIComponent(rel || '');
        const systemPath = decodedPath.replace(/\+/g, ' ').replace(/\//g, path.sep);
        const mediaPath = mediaService.getMediaPath(systemPath);
        const basePath = mediaService.getMediaBasePath();
        if (!mediaPath || (!mediaPath.startsWith(basePath + path.sep) && mediaPath !== basePath)) {
            return response.status(403).send('Forbidden');
        }
        // Determine cache path
        const dir = path.dirname(mediaPath);
        const nameNoExt = path.parse(mediaPath).name;
        const cacheDir = path.join(dir, '.thumbs');
        const cacheFile = path.join(cacheDir, `${nameNoExt}.jpg`);
        await fs.promises.mkdir(cacheDir, { recursive: true });
        let needsRender = true;
        try {
            const [orig, cache] = await Promise.all([fs.promises.stat(mediaPath), fs.promises.stat(cacheFile)]);
            if (cache.mtimeMs >= orig.mtimeMs) needsRender = false;
        } catch { needsRender = true; }
        if (needsRender) {
            const img = sharp(mediaPath);
            const meta = await img.metadata();
            let w = width, h = height || null;
            if (!height && meta.width && meta.height) {
                const ar = meta.width / meta.height;
                if (meta.width >= meta.height) { w = Math.min(width, meta.width); h = Math.round(w / ar); }
                else { h = Math.min(width, meta.height); w = Math.round(h * ar); }
            }
            const buf = await sharp(mediaPath).resize(w, h, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75, progressive: true, mozjpeg: true }).toBuffer();
            await fs.promises.writeFile(cacheFile, buf);
        }
        response.set({ 'Cache-Control': 'public, max-age=86400', 'Content-Type': 'image/jpeg' });
        return response.sendFile(cacheFile);
    } catch (e) {
        AppUtils.errorLog(MODULE_NAME, 'thumb', 'Error generating media thumbnail', { error: e?.message });
        return response.status(404).send('Thumb not available');
    }
});
const MODULE_NAME = 'MediaRouter';

/**
 * Route to serve a random media file from a specific category or from all media.
 * If no category is specified, a random media from any category is returned.
 */
mediaRouter.get("/random/:category?", (request, response) => {
    const FUNCTION_NAME = 'handleRandomMediaRequest';
    const { category } = request.params;

    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing random media request', { category });

    try {
        const randomMedia = mediaService.getRandomMedia(category);

        if (!randomMedia) {
            AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'No media found for the given criteria', { category });
            return response.status(404).json(AppUtils.createErrorResponse("No media found"));
        }

        const mediaPath = mediaService.getMediaPath(randomMedia.relativePath);
        
        AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Serving random media file', { 
            category,
            fileName: randomMedia.name 
        });
        
        response.sendFile(mediaPath);
    } catch (error) {
        AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error serving random media', { category, error: error.message });
        response.status(500).json(AppUtils.createErrorResponse("Internal server error"));
    }
});

/**
 * Route to serve a specific media file by its relative path.
 * The path is expected to be URL-encoded and can include subdirectories.
 */
mediaRouter.get("/*", (request, response) => {
    const FUNCTION_NAME = 'handleSpecificMediaRequest';
    // Get the full path after /media/
    const relativePath = request.params[0];

    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing specific media request', { relativePath });

    try {
        const decodedPath = decodeURIComponent(relativePath || '');
        // Normalize and build absolute path
        const systemPath = decodedPath.replace(/\+/g, ' ').replace(/\//g, path.sep);
        const mediaPath = mediaService.getMediaPath(systemPath);
        const basePath = mediaService.getMediaBasePath();

        // Security check to prevent path traversal (ensure path is inside base path)
        if (!mediaPath || !mediaPath.startsWith(basePath + path.sep) && mediaPath !== basePath) {
             AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Attempted path traversal', { relativePath, resolved: mediaPath });
             return response.status(403).send("Forbidden");
        }

        // Check if the path is a directory (category)
    if (fs.existsSync(mediaPath) && fs.lstatSync(mediaPath).isDirectory()) {
            // If it's a directory, redirect to get a random media from that category
            AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Directory requested, redirecting to random media', { category: decodedPath });
            return response.redirect(`/media/random/${decodedPath}`);
        }

        // The sendFile method will handle Content-Type and other headers
        response.sendFile(mediaPath, (err) => {
            if (err) {
                const exists = fs.existsSync(mediaPath);
                AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'File not found or error sending file', { path: mediaPath, exists, basePath, relativePath: decodedPath, nodeError: err.message });
                if (!response.headersSent) {
                    response.status(404).json(AppUtils.createErrorResponse("Media not found"));
                }
            } else {
                AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Specific media served successfully', { path: mediaPath });
            }
        });
    } catch (error) {
        AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error serving specific media', { 
            module: MODULE_NAME,
            function: FUNCTION_NAME,
            message: 'Error serving specific media',
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            relativePath 
        });
        response.status(500).json(AppUtils.createErrorResponse("Internal server error"));
    }
});


export default mediaRouter;
