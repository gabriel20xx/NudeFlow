const express = require("express");
const mediaService = require("../services/mediaService");
const AppUtils = require('../utils/AppUtils');

const mediaRouter = express.Router();
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
 * The path is expected to be URL-encoded.
 */
mediaRouter.get("/:relativePath", (request, response) => {
    const FUNCTION_NAME = 'handleSpecificMediaRequest';
    const { relativePath } = request.params;

    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing specific media request', { relativePath });

    try {
        const decodedPath = decodeURIComponent(relativePath);
        const mediaPath = mediaService.getMediaPath(decodedPath);

        // Security check to prevent path traversal
        if (!mediaPath.startsWith(mediaService.getMediaBasePath())) {
             AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Attempted path traversal', { relativePath });
             return response.status(403).send("Forbidden");
        }

        // The sendFile method will handle Content-Type and other headers
        response.sendFile(mediaPath, (err) => {
            if (err) {
                AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'File not found or error sending file', { path: mediaPath, error: err.message });
                if (!response.headersSent) {
                    response.status(404).json(AppUtils.createErrorResponse("Media not found"));
                }
            } else {
                AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Specific media served successfully', { path: mediaPath });
            }
        });
    } catch (error) {
        AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error serving specific media', { relativePath, error: error.message });
        response.status(500).json(AppUtils.createErrorResponse("Internal server error"));
    }
});


module.exports = mediaRouter;
