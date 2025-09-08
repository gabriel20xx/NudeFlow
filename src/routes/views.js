import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import AppUtils from '../utils/AppUtils.js';
import * as mediaService from '../services/mediaService.js';

// __dirname shim for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viewsRouter = express.Router();
const MODULE_NAME = 'ViewsRouter';

// Middleware for serving static files
viewsRouter.use(express.static(path.join(__dirname, '../public')));

/**
 * Home page route handler
 */
viewsRouter.get("/", (request, response) => {
  const FUNCTION_NAME = 'handleHomePageRoute';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing home page request');
  
  try {
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Rendering home page');
  response.render("home", { title: "Home" });
    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Home page rendered successfully');
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error rendering home page', error);
    response.status(500).render('error', { message: 'Failed to load home page' });
  }
});

/**
 * Categories page route handler
 */
viewsRouter.get("/categories", (request, response) => {
  const FUNCTION_NAME = 'handleCategoriesPageRoute';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing categories page request');
  
  try {
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Rendering categories page');
    response.render("categories", { title: "Categories" });
    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Categories page rendered successfully');
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error rendering categories page', error);
    response.status(500).render('error', { message: 'Failed to load categories page' });
  }
});

/**
 * Profile page route handler
 */
viewsRouter.get("/profile", (request, response) => {
  const FUNCTION_NAME = 'handleProfilePageRoute';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing profile page request');
  
  try {
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Rendering profile page');
  const isAuthenticated = !!(request.session && request.session.userId);
  const user = request.session?.user || null;
  response.render("profile", { title: "Profile", isAuthenticated, user });
    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Profile page rendered successfully');
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error rendering profile page', error);
    response.status(500).render('error', { message: 'Failed to load profile page' });
  }
});

/**
 * Search page route handler
 */
viewsRouter.get("/search", (request, response) => {
  const FUNCTION_NAME = 'handleSearchPageRoute';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing search page request');
  
  try {
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Rendering search page');
    response.render("search", { title: "Search" });
    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Search page rendered successfully');
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error rendering search page', error);
    response.status(500).render('error', { message: 'Failed to load search page' });
  }
});

/**
 * Saved videos page route handler
 */
viewsRouter.get("/saved", (request, response) => {
  const FUNCTION_NAME = 'handleSavedPageRoute';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing saved page request');
  
  try {
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Rendering saved page');
    response.render("saved", { title: "Saved" });
    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Saved page rendered successfully');
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error rendering saved page', error);
    response.status(500).render('error', { message: 'Failed to load saved page' });
  }
});

/**
 * Category view route handler (renders Home view but filtered by category)
 * This only handles known categories; otherwise, it defers to next routes (e.g., /api, /profile).
 */
viewsRouter.get('/:categoryName', (request, response, next) => {
  const FUNCTION_NAME = 'handleCategoryHomeView';
  const { categoryName } = request.params;

  try {
  const categories = mediaService.getCategories() || [];
  const raw = String(categoryName || '');
  const decoded = decodeURIComponent(raw);
  const match = categories.find(c => c.name.toLowerCase() === decoded.toLowerCase());
    if (!match) return next();
  // Use formatted display name; special-case 'all' to title-case
  const display = (String(match.name).toLowerCase() === 'all')
    ? 'All'
    : AppUtils.formatRouteNameForDisplay(match.displayName || match.name);
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Rendering home view for category', { categoryName: match.name, display });
    return response.render('home', { title: 'Home', currentCategoryDisplay: display });
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error handling category home view', error, { categoryName });
    return next();
  }
});

export default viewsRouter;
