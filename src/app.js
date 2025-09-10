import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
// import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import http from 'http';
import https from 'https';
import fs from 'fs';
import { mountTheme } from '../../NudeShared/server/theme/mountTheme.js';
import AppUtils from './utils/AppUtils.js';
import { initDb as initPg, query as pgQuery } from '../../NudeShared/server/index.js';
import { runMigrations } from '../../NudeShared/server/index.js';
import { buildAuthRouter } from '../../NudeShared/server/index.js';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import * as mediaService from './services/mediaService.js';

// Load environment variables early
try {
  // Optional dependency; wrap in try in case dotenv not installed in prod image
  (await import('dotenv')).config();
} catch {
  // Silent if dotenv not available
}

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

AppUtils.infoLog(MODULE_NAME, 'SERVER_INIT', 'Starting NudeFlow server initialization', {
  serverPort
});

// Middleware configuration
const configureMiddleware = () => {
  const FUNCTION_NAME = 'configureMiddleware';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Configuring Express middleware');
  
  // CORS configuration from environment
  const corsOptions = {
    origin: process.env.CORS_ORIGIN || "*"
  };
  
  expressApplication.use(cors(corsOptions));
  expressApplication.use(helmet({
    contentSecurityPolicy: false // Disable CSP by default; can be configured later
  }));
  expressApplication.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
  expressApplication.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '10mb' }));
  // Sessions
  const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';
  const PgStore = connectPg(session);
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
  expressApplication.set('trust proxy', 1);
  // Default to non-secure cookies for local HTTP; elevate to secure dynamically on HTTPS requests
  expressApplication.use(session({
    store: process.env.DATABASE_URL ? new PgStore({ conString: process.env.DATABASE_URL }) : undefined,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // will be flipped to true below when req.secure
      domain: cookieDomain,
      maxAge: 1000*60*60*24*7
    }
  }));
  // If behind a proxy or running HTTPS, mark cookie secure per-request
  expressApplication.use((req, _res, next) => {
    try {
      if (req.secure && req.session && req.session.cookie) {
        req.session.cookie.secure = true;
      }
    } catch {}
    next();
  });

  // View engine setup
  expressApplication.set("view engine", "ejs");
  // Updated views path to new unified structure and add shared views
  expressApplication.set("views", [
    path.join(__dirname, "public", "views"),
    path.resolve(__dirname, '..', '..', 'NudeShared', 'views')
  ]);
  // Serve static assets from src/public (unified monorepo convention)
  expressApplication.use(express.static(path.join(__dirname, 'public')));
  // Mount shared client assets; prefer external NudeShared checkout if provided
  const sharedCandidates = [
    process.env.NUDESHARED_DIR,
    '/app/NudeShared',
    path.join(__dirname, '..', '..', 'NudeShared'),
    path.join(__dirname, '..', '..', 'shared')
  ].filter(Boolean);
  let mountedSharedFrom = '';
  for (const candidate of sharedCandidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        expressApplication.use('/shared', express.static(candidate));
        mountedSharedFrom = candidate;
        break;
      }
    } catch { /* no-op */ }
  }
  if (mountedSharedFrom) {
    AppUtils.infoLog(MODULE_NAME, 'STARTUP', 'Mounted shared static assets at /shared', { from: mountedSharedFrom });
  } else {
    AppUtils.warnLog(MODULE_NAME, 'STARTUP', 'No shared assets directory found; /shared not mounted');
  }

  // Unified theme mount
  mountTheme(expressApplication, { projectDir: __dirname, sharedDir: process.env.NUDESHARED_DIR || path.resolve(__dirname, '..', '..', 'NudeShared'), logger: {
    info: (...a)=>AppUtils.infoLog(MODULE_NAME, 'THEME', ...a),
    warn: (...a)=>AppUtils.warnLog(MODULE_NAME, 'THEME', ...a),
    error: (...a)=>AppUtils.errorLog(MODULE_NAME, 'THEME', ...a)
  } });
  
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Express middleware configuration completed');
};

// Routes configuration
const configureRoutes = async () => {
  const FUNCTION_NAME = 'configureRoutes';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Setting up application routes');
  
  const mediaRoutesModule = (await import('./routes/media.js')).default;
  const viewRoutesModule = (await import('./routes/views.js')).default;
  const apiRoutesModule = (await import('./api/apiRoutes.js')).default;

  expressApplication.use("/media", mediaRoutesModule);
  expressApplication.use('/auth', buildAuthRouter(express.Router));
  expressApplication.get('/admin/users', async (req, res) => res.render('admin/users'));
  expressApplication.get('/auth/reset/request', (req, res) => res.render('auth/request-reset'));
  // Inject siteTitle into all view renders
  expressApplication.use((req, res, next)=>{
    res.locals.siteTitle = SITE_TITLE;
    res.locals.preloadRadius = PRELOAD_RADIUS;
    // Ensure sign-up is available in shared header for NudeFlow
    res.locals.disableSignup = false;
    next();
  });
  expressApplication.use("/", viewRoutesModule);
  expressApplication.use("/api", apiRoutesModule);
  // Simple health probe (no heavy deps)
  expressApplication.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });
  // DB health probe
  expressApplication.get('/health/db', async (req, res) => {
    try {
      const { rows } = await pgQuery('SELECT 1 as ok');
      res.json({ status: 'ok', rows });
    } catch (e) {
      res.status(500).json({ status: 'error', message: String(e?.message || e) });
    }
  });
  
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Application routes configuration completed');
};

// Error handling middleware
const configureErrorHandling = () => {
  const FUNCTION_NAME = 'configureErrorHandling';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Setting up error handling middleware');
  
  // Handle 404 routes first (no error object supplied)
  expressApplication.use((request, response) => {
    if (request.accepts('html')) {
      AppUtils.debugLog(MODULE_NAME, '404_HANDLER', 'Route not found (html)', { 
        requestedUrl: request.url,
        requestMethod: request.method 
      });
      return response.status(404).render('404', { title: 'Page Not Found' });
    }
    if (request.accepts('json')) {
      AppUtils.debugLog(MODULE_NAME, '404_HANDLER', 'Route not found (json)', { 
        requestedUrl: request.url,
        requestMethod: request.method 
      });
      return response.status(404).json(AppUtils.createErrorResponse('Not Found', 404));
    }
    return response.status(404).type('txt').send('Not Found');
  });

  // Global error handler (must have 4 args)
  // eslint-disable-next-line no-unused-vars
  expressApplication.use((error, request, response, next) => {
    AppUtils.errorLog(MODULE_NAME, 'GLOBAL_ERROR_HANDLER', 'Unhandled application error', error, { 
      requestUrl: request.url,
      requestMethod: request.method
    });
    if (response.headersSent) return; // If headers already sent, let Express handle
    const wantsJson = request.accepts('json') && !request.accepts('html');
    if (wantsJson) {
      response.status(500).json(AppUtils.createErrorResponse('Internal Server Error', 500));
    } else {
      response.status(500).render('error', { title: 'Server Error', message: 'Something went wrong!' });
    }
  });
  
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Error handling middleware configured');
};

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
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Starting Express server');
  
  if (!serverRef) serverRef = await buildServer(expressApplication);
  serverRef.listen(serverPort, () => {
    const protocol = ENABLE_HTTPS ? 'https' : 'http';
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'NudeFlow server started successfully', { 
        serverPort,
        protocol,
        environment: process.env.NODE_ENV || 'development'
      });
    (async () => {
      try {
  await initPg(); // Will use PostgreSQL if available, else SQLite
  await runMigrations();
      } catch (e) {
        AppUtils.errorLog(MODULE_NAME, 'STARTUP', 'Database initialization failed', e);
      }
    })();
  });
};

// Main server initialization function
const initializeServer = async () => {
  const FUNCTION_NAME = 'initializeServer';
  AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Beginning server initialization sequence');
  
  try {
    if (!expressApplication) {
      expressApplication = express();
      await mediaService.initializeMediaService();
      configureMiddleware();
  await configureRoutes();
      configureErrorHandling();
      configureGracefulShutdown();
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
    expressApplication = express();
    await mediaService.initializeMediaService();
    configureMiddleware();
  await configureRoutes();
    configureErrorHandling();
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

export { createApp, initializeServer };
