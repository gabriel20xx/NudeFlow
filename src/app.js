// Use centralized shim for express (supports monorepo test runs without local NudeFlow install)
import express from './express-shim.js';
let cors; try { ({ default: cors } = await import('cors')); } catch { cors = () => (req,res,next)=>next(); }
let helmet; try { ({ default: helmet } = await import('helmet')); } catch { helmet = () => (req,res,next)=>next(); }
// connect-pg-simple handled by shared session factory (kept lazy there)
import path from 'path';
// import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import http from 'http';
import https from 'https';
import fs from 'fs';
import { attachStandardNotFoundAndErrorHandlers } from '../../NudeShared/server/index.js';
import { createStandardApp } from '../../NudeShared/server/app/createStandardApp.js';
import AppUtils from './utils/AppUtils.js';
import { initDb as initPg, query as pgQuery } from '../../NudeShared/server/index.js';
import { runMigrations } from '../../NudeShared/server/index.js';
import * as mediaService from './services/mediaService.js';

// Load environment variables early
try {
  // Optional dependency; wrap in try in case dotenv not installed in prod image
  (await import('dotenv')).config();
} catch {
  // Silent if dotenv not available
}
try { process.on('uncaughtException', ()=>{/* swallow to prevent crash in ephemeral env */}); } catch { /* ignore missing process (non-node env) */ }

const MODULE_NAME = 'MainServer';
const SITE_TITLE = process.env.SITE_TITLE || 'NudeFlow';
const PRELOAD_RADIUS = (function(){
  const clamp = (n,min,max)=>{ n=Number(n); return Math.max(min, Math.min(max, Number.isFinite(n)?n:min)); };
  return clamp(process.env.PRELOAD_RADIUS ?? process.env.PRELOAD_NEIGHBOR_RADIUS ?? 2, 0, 10);
})();
// Factory pattern to allow tests to build app without starting HTTP listener
let expressApplication; // lazily created

// Configuration
const serverPort = process.env.PORT || 8080;

if (!globalThis.__NUDEFLOW_INIT_LOGGED) {
  AppUtils.infoLog(MODULE_NAME, 'SERVER_INIT', 'Starting NudeFlow server initialization', { serverPort });
  globalThis.__NUDEFLOW_INIT_LOGGED = true;
}

// Flow-specific additional middleware (only CORS + helmet + public static now; body parsers, session, auth, view engine handled by factory)
const configureMiddleware = async () => {
  const corsOptions = { origin: process.env.CORS_ORIGIN || '*' };
  expressApplication.use(cors(corsOptions));
  expressApplication.use(helmet({ contentSecurityPolicy: false }));
  expressApplication.use(express.static(path.join(__dirname, 'public')));
};

// Routes configuration
const configureRoutes = async () => {
  const FUNCTION_NAME = 'configureRoutes';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Setting up application routes');
  
  const mediaRoutesModule = (await import('./routes/media.js')).default;
  const viewRoutesModule = (await import('./routes/views.js')).default;
  const apiRoutesModule = (await import('./api/apiRoutes.js')).default;

  expressApplication.use("/media", mediaRoutesModule);
  // (Auth router mounted manually earlier after session; shared base skipped it)
  expressApplication.get('/admin/users', async (req, res) => res.render('admin/users'));
  expressApplication.get('/auth/reset/request', (req, res) => res.render('auth/request-reset'));
  // Inject siteTitle into all view renders
  expressApplication.use((req, res, next)=>{
    res.locals.siteTitle = SITE_TITLE;
    res.locals.preloadRadius = PRELOAD_RADIUS;
    // Ensure sign-up is available in shared header for NudeFlow
    res.locals.disableSignup = false;
  // Provide app stylesheet to shared header and disable socket.io include
  res.locals.appCssHref = '/css/style.css';
  res.locals.enableSocketIO = false;
    next();
  });
  expressApplication.use("/", viewRoutesModule);
  expressApplication.use("/api", apiRoutesModule);
  // Legacy /health and /health/db retained for backward compatibility: now provided /health alias via hardening middleware.
  // If future deprecation desired, remove these after external monitors adopt /healthz.
  if (!expressApplication._router?.stack.some(r=> r.route?.path === '/health')) {
    expressApplication.get('/health', (req,res)=> res.redirect(302,'/healthz'));
  }
  expressApplication.get('/health/db', async (req,res)=>{
    try { const { rows } = await pgQuery('SELECT 1 as ok'); res.json({ status:'ok', rows }); }
    catch(e){ res.status(500).json({ status:'error', message: String(e?.message||e) }); }
  });
  // (Cache policy endpoint registered via applySharedBase)
  
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Application routes configuration completed');
};

// Error handling middleware
// Legacy custom error handling removed in favor of standardized shared handlers.
const configureErrorHandling = () => { /* intentionally noop, retained for call-site parity */ };

// Graceful shutdown handling
const configureGracefulShutdown = () => {
  const FUNCTION_NAME = 'configureGracefulShutdown';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Setting up graceful shutdown handlers');
  
  process.on('SIGINT', () => {
    AppUtils.infoLog(MODULE_NAME, 'GRACEFUL_SHUTDOWN', 'Received SIGINT, shutting down gracefully');
    process.exit(0);
  });
  
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Graceful shutdown handlers configured');
};

// Start server function
const ENABLE_HTTPS = (process.env.HTTPS === 'true' || process.env.ENABLE_HTTPS === 'true');
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '';

async function buildServer(appInstance) {
  if (!ENABLE_HTTPS) return http.createServer(appInstance);
  let key; let cert;
  const haveProvided = SSL_KEY_PATH && SSL_CERT_PATH && fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH);
  if (haveProvided) {
    try {
      key = fs.readFileSync(SSL_KEY_PATH);
      cert = fs.readFileSync(SSL_CERT_PATH);
      AppUtils.infoLog(MODULE_NAME, 'HTTPS', 'Loaded provided SSL key & cert', { SSL_KEY_PATH, SSL_CERT_PATH });
    } catch (e) {
      AppUtils.errorLog(MODULE_NAME, 'HTTPS', 'Failed reading provided key/cert, will self-sign', e);
    }
  }
  if (!key || !cert) {
    try {
  const selfsigned = (await import('selfsigned')).default;
      const attrs = [{ name: 'commonName', value: 'localhost' }];
      const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048, algorithm: 'sha256' });
      key = pems.private;
      cert = pems.cert;
      AppUtils.warnLog(MODULE_NAME, 'HTTPS', 'Using generated self-signed certificate (development only)');
    } catch (e) {
      AppUtils.errorLog(MODULE_NAME, 'HTTPS', 'Failed to generate self-signed cert. Falling back to HTTP.', e);
      return http.createServer(appInstance);
    }
  }
  return https.createServer({ key, cert }, appInstance);
}

let serverRef; // store created server

const startServer = async () => {
  const FUNCTION_NAME = 'startServer';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Starting Express server (will await DB readiness)');
  try {
    AppUtils.infoLog(MODULE_NAME, 'DB_INIT', 'Initializing database');
    await initPg();
    AppUtils.infoLog(MODULE_NAME, 'MIGRATIONS', 'Running migrations');
    await runMigrations();
    AppUtils.infoLog(MODULE_NAME, 'DB_READY', 'Database ready');
  } catch(e){
    AppUtils.errorLog(MODULE_NAME, 'DB_INIT', 'Database init/migrations failed (continuing but API may error)', e);
  }
  if (!serverRef) serverRef = await buildServer(expressApplication);
  await new Promise(resolve => serverRef.listen(serverPort, resolve));
  const protocol = ENABLE_HTTPS ? 'https' : 'http';
  AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'NudeFlow server started successfully', { 
    serverPort,
    protocol,
    environment: process.env.NODE_ENV || 'development'
  });
};

// Main server initialization function
const initializeServer = async () => {
  const FUNCTION_NAME = 'initializeServer';
  AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Beginning server initialization sequence');
  
  try {
    if (!expressApplication) {
      // Build shared baseline app (body parsers + session + /auth + shared static/theme)
      expressApplication = await createStandardApp({
        serviceName: 'NudeFlow',
        projectDir: __dirname,
        sharedDir: path.resolve(__dirname, '..', '..', 'NudeShared'),
        sessionOptions: { domain: process.env.COOKIE_DOMAIN || undefined },
        view: { paths: [path.join(__dirname, 'public', 'views'), path.resolve(__dirname, '..', '..', 'NudeShared', 'views')] },
        cachePolicies: {
          shared: { cssJs: 'public, max-age=3600', images: 'public, max-age=86400, stale-while-revalidate=604800' },
          themeCss: 'public, max-age=3600',
          localPublic: 'default (no explicit overrides)'
        },
        cachePolicyNote: 'Adjust in NudeFlow/src/app.js when modifying static caching.'
      });
      await mediaService.initializeMediaService();
      await configureMiddleware(); // retains Flow-specific middleware (CORS, helmet, explicit overlay route)
      await configureRoutes();
      configureErrorHandling();
      configureGracefulShutdown();
      attachStandardNotFoundAndErrorHandlers(expressApplication, { serviceName:'NudeFlow' });
    }
  await startServer();
    
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Server initialization completed successfully');
  } catch (initializationError) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Server initialization failed', initializationError);
    process.exit(1);
  }
};

// Build app (without starting listener) for testing purposes
const createApp = async () => {
  if (!expressApplication) {
    expressApplication = await createStandardApp({
      serviceName: 'NudeFlow',
      projectDir: __dirname,
      sharedDir: path.resolve(__dirname, '..', '..', 'NudeShared'),
      sessionOptions: { domain: process.env.COOKIE_DOMAIN || undefined },
      view: { paths: [path.join(__dirname, 'public', 'views'), path.resolve(__dirname, '..', '..', 'NudeShared', 'views')] },
      cachePolicies: {
        shared: { cssJs: 'public, max-age=3600', images: 'public, max-age=86400, stale-while-revalidate=604800' },
        themeCss: 'public, max-age=3600',
        localPublic: 'default (no explicit overrides)'
      },
      cachePolicyNote: 'Adjust in NudeFlow/src/app.js when modifying static caching.'
    });
    await mediaService.initializeMediaService();
    await configureMiddleware();
    await configureRoutes();
    configureErrorHandling();
    attachStandardNotFoundAndErrorHandlers(expressApplication, { serviceName:'NudeFlow' });
  }
  return expressApplication;
};

// Start when executed directly (robust on Windows and POSIX)
try {
  const executedScript = process.argv[1] ? path.resolve(process.argv[1]) : '';
  const currentModule = path.resolve(fileURLToPath(import.meta.url));
  if (executedScript && executedScript === currentModule) {
    initializeServer();
  }
} catch {
  // no-op
}

// Provide a default export for test convenience (factory returning app instance)
export default async function defaultAppFactory(){
  return await createApp();
}
export { createApp, initializeServer };
