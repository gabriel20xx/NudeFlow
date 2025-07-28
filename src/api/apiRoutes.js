const express = require("express");
const mediaService = require("../services/mediaService");
const AppUtils = require("../utils/AppUtils");

const MODULE_NAME = 'MainAPIRoutes';
const apiRouter = express.Router();

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
    thumbnail: `/media/${item.relativePath}`,
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
  
  const categories = mediaService.getCategories();
  
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
  
  const categories = mediaService.getCategories();
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
  
  const categoryMedia = mediaService.getAllMedia().filter(
    item => item.category.toLowerCase() === categoryName.toLowerCase()
  );

  const formattedMedia = categoryMedia.map(item => ({
    ...item,
    thumbnail: `/media/${item.relativePath}`,
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
 * User profile retrieval endpoint (placeholder)
 */
apiRouter.get("/profile", (request, response) => {
  AppUtils.debugLog(MODULE_NAME, 'handleGetProfileRequest', 'Processing get profile request');
  const mockProfile = {
    username: "Anonymous",
    bio: "This is a mock profile."
  };
  response.json(AppUtils.createSuccessResponse(mockProfile, 'Profile retrieved'));
});

module.exports = apiRouter;
