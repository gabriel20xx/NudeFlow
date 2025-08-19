const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const AppUtils = require("./utils/AppUtils");
const mediaService = require("./services/mediaService");

// Load environment variables early
try {
  // Optional dependency; wrap in try in case dotenv not installed in prod image
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require("dotenv").config();
} catch (e) {
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
  
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Express middleware configuration completed');
};

// Routes configuration
const configureRoutes = () => {
  const FUNCTION_NAME = 'configureRoutes';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Setting up application routes');
  
  const mediaRoutesModule = require("./routes/media");
  const viewRoutesModule = require("./routes/views");
  const apiRoutesModule = require("./api/apiRoutes");

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
  expressApplication.use((request, response, next) => {
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
const startServer = () => {
  const FUNCTION_NAME = 'startServer';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Starting Express server');
  
  expressApplication.listen(serverPort, () => {
  AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'NudeFlow server started successfully', { 
      serverPort,
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
      configureRoutes();
      configureErrorHandling();
      configureGracefulShutdown();
    }
    startServer();
    
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
    configureRoutes();
    configureErrorHandling();
  }
  return expressApplication;
};

if (require.main === module) {
  // Start the application only when executed directly
  initializeServer();
}

module.exports = { createApp, initializeServer };
