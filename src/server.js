const express = require("express");
const cors = require("cors");
const path = require("path");
const AppUtils = require("./utils/AppUtils");
const mediaService = require("./services/mediaService");

const MODULE_NAME = 'MainServer';
const expressApplication = express();

// Configuration
const serverPort = process.env.PORT || 3000;

AppUtils.infoLog(MODULE_NAME, 'SERVER_INIT', 'Starting XXXTok server initialization', {
  serverPort
});

// Middleware configuration
const configureMiddleware = () => {
  const FUNCTION_NAME = 'configureMiddleware';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Configuring Express middleware');
  
  expressApplication.use(cors());
  expressApplication.use(express.json({ limit: '10mb' }));
  expressApplication.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // View engine setup
  expressApplication.set("view engine", "ejs");
  expressApplication.set("views", path.join(__dirname, "views"));
  expressApplication.use(express.static(path.join(__dirname, "public")));
  
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
  expressApplication.use("/", viewRoutesModule);
  expressApplication.use("/api", apiRoutesModule);
  
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Application routes configuration completed');
};

// Error handling middleware
const configureErrorHandling = () => {
  const FUNCTION_NAME = 'configureErrorHandling';
  AppUtils.debugLog(MODULE_NAME, FUNCTION_NAME, 'Setting up error handling middleware');
  
  // Global error handler
  expressApplication.use((error, request, response, next) => {
    AppUtils.errorLog(MODULE_NAME, 'GLOBAL_ERROR_HANDLER', 'Unhandled application error', { 
      error: error.message,
      requestUrl: request.url,
      requestMethod: request.method
    });
    response.status(500).json(AppUtils.createErrorResponse("Something went wrong!"));
  });

  // Handle 404 routes
  expressApplication.use((request, response) => {
    AppUtils.debugLog(MODULE_NAME, '404_HANDLER', 'Route not found', { 
      requestedUrl: request.url,
      requestMethod: request.method 
    });
    response.status(404).render('404', { title: 'Page Not Found' });
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
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'XXXTok server started successfully', { 
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
    await mediaService.initializeMediaService();
    
    configureMiddleware();
    configureRoutes();
    configureErrorHandling();
    configureGracefulShutdown();
    
    startServer();
    
    AppUtils.infoLog(MODULE_NAME, FUNCTION_NAME, 'Server initialization completed successfully');
  } catch (initializationError) {
    AppUtils.errorLog(MODULE_NAME, FUNCTION_NAME, 'Server initialization failed', initializationError);
    process.exit(1);
  }
};

// Start the application
initializeServer();
