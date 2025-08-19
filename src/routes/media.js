const express = require("express");
const path = require("path");
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
        const fs = require('fs');
        if (fs.existsSync(mediaPath) && fs.lstatSync(mediaPath).isDirectory()) {
            // If it's a directory, redirect to get a random media from that category
            AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Directory requested, redirecting to random media', { category: decodedPath });
            return response.redirect(`/media/random/${decodedPath}`);
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


module.exports = mediaRouter;
