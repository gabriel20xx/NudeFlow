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
 * Legacy categories route -> redirect to root (tag-based navigation now)
 * Keep 301 for SEO-ish permanence; can adjust later. Tests will assert redirect.
 */
viewsRouter.get('/categories', (req, res) => {
  // Quick response path (skip any expensive pre-work)
  res.redirect(301, '/');
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
 * Playlists page route handler (replaces Saved)
 */
viewsRouter.get("/playlists", (request, response) => {
  const FUNCTION_NAME = 'handlePlaylistsPageRoute';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Processing playlists page request');
  
  try {
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Rendering playlists page');
    response.render("playlists", { title: "Playlists" });
    AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Playlists page rendered successfully');
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error rendering playlists page', error);
    response.status(500).render('error', { message: 'Failed to load playlists page' });
  }
});

/**
 * Playlist detail page: shows all items in the playlist
 */
viewsRouter.get('/playlists/:id', (request, response) => {
  const FUNCTION_NAME = 'handlePlaylistDetail';
  try {
    const id = Number(request.params.id);
    if (!id || Number.isNaN(id)) return response.status(404).render('error', { message: 'Playlist not found' });
    return response.render('playlist_view', { title: 'Playlist' });
  } catch (error) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Error rendering playlist detail', error);
    return response.status(500).render('error', { message: 'Failed to load playlist' });
  }
});

// Removed dynamic /:categoryName handler (legacy category filtering) in favor of tag-based client filtering.

export default viewsRouter;
