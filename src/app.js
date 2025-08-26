import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import http from 'http';
import https from 'https';
import fs from 'fs';
import AppUtils from './utils/AppUtils.js';
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

  // View engine setup
  expressApplication.set("view engine", "ejs");
  // Updated views path to new unified structure (views inside public)
  expressApplication.set("views", path.join(__dirname, "public", "views"));
  // Serve static assets from src/public (unified monorepo convention)
  expressApplication.use(express.static(path.join(__dirname, 'public')));
  // Mount shared client logger from repo-local shared folder
  expressApplication.use('/shared', express.static(path.join(__dirname, '..', '..', 'shared')));
  AppUtils.infoLog(MODULE_NAME, 'STARTUP', 'Mounted shared static assets at /shared (repo local)');

  // Serve theme.css from app public if present (synced from shared)
  const themeLocal = path.join(__dirname, 'public', 'css', 'theme.css');
  if (fs.existsSync(themeLocal)) {
    expressApplication.get('/assets/theme.css', (req, res) => res.sendFile(themeLocal));
    AppUtils.infoLog(MODULE_NAME, 'STARTUP', 'Exposed local theme at /assets/theme.css', { themeLocal });
  }
  
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
  // Inject siteTitle into all view renders
  expressApplication.use((req, res, next)=>{ res.locals.siteTitle = SITE_TITLE; next(); });
  expressApplication.use("/", viewRoutesModule);
  expressApplication.use("/api", apiRoutesModule);
  // Simple health probe (no heavy deps)
  expressApplication.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
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
