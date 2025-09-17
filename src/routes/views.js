import express from '../express-shim.js';
import path from 'path';
import { fileURLToPath } from 'url';
import AppUtils from '../utils/AppUtils.js';

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
 * Tags tab route handler
 */
viewsRouter.get('/tags', (req, res) => {
  try {
    res.render('tags', { title: 'Tags' });
  } catch {
    res.status(500).render('error', { message: 'Failed to load tags page' });
  }
});

// Legacy categories redirect (tests expect 301 to home per migration docs)
viewsRouter.get('/categories', (req, res) => {
  // Permanent redirect to root (home)
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
    // NOTE: Previous implementation checked session.userId which is not set by the shared auth router.
    // Shared auth stores the authenticated principal at session.user (with .id). For forward + backward
    // compatibility we derive the auth flag from session.user.id. (A compatibility alias is now also
    // written in the auth router, but we keep this logic resilient in case of future changes.)
    const user = request.session?.user || null;
    const isAuthenticated = !!(user && user.id);
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
