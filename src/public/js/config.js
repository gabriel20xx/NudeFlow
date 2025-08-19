// Configuration and utilities for frontend JavaScript
window.ApplicationConfiguration = {
  // Base URL for API calls - can be overridden by environment
  baseServerUrl: window.location.origin,
  
  // API endpoints configuration
  apiEndpoints: {
    routes: '/api/routes',
    search: '/api/search',
    categories: '/api/categories',
    saved: '/api/saved',
    profile: '/api/profile',
    images: '/images'
  },
  
  // User interface settings
  userInterfaceSettings: {
    preLoadImageCount: 5,
    transitionDuration: 500,
    maxSearchResults: 20,
    debugMode: true // Set to false in production
  },
  
  // Media playback settings
  mediaPlaybackSettings: {
    autoplay: true,
    loop: true,
    controls: false,
    muted: true,
    playsInline: true
  },

  // Logging configuration with severity levels
  loggingConfiguration: {
    LOG_LEVELS: {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      FATAL: 4
    },
    enableClientLogging: true,
    logLevelFilter: 'DEBUG' // Minimum level to log
  }
};

// Frontend utility functions
window.ApplicationUtilities = {
  /**
   * Universal client-side logging function with severity levels
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR, FATAL)
   * @param {string} moduleName - Name of the module
   * @param {string} functionName - Name of the function
   * @param {string} message - Log message
   * @param {Object} additionalData - Additional data to log
   */
  clientLog: function(level, moduleName, functionName, message, additionalData = {}) {
    if (!ApplicationConfiguration.loggingConfiguration.enableClientLogging || 
        !ApplicationConfiguration.userInterfaceSettings.debugMode) {
      return;
    }
    
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0') + ' ' + 
                     String(now.getHours()).padStart(2, '0') + ':' + 
                     String(now.getMinutes()).padStart(2, '0') + ':' + 
                     String(now.getSeconds()).padStart(2, '0');
    const logMessage = `[${timestamp}] [${level}] [${moduleName}:${functionName}] ${message}`;
    
    // Use appropriate console method based on severity
    switch(level) {
      case 'DEBUG':
        console.debug(logMessage, additionalData);
        break;
      case 'INFO':
        console.info(logMessage, additionalData);
        break;
      case 'WARN':
        console.warn(logMessage, additionalData);
        break;
      case 'ERROR':
      case 'FATAL':
        console.error(logMessage, additionalData);
        break;
      default:
        console.log(logMessage, additionalData);
    }
  },

  /**
   * Debug level logging (client-side)
   * @param {string} moduleName - Name of the module
   * @param {string} functionName - Name of the function
   * @param {string} message - Log message
   * @param {Object} additionalData - Additional data to log
   */
  debugLog: function(moduleName, functionName, message, additionalData = {}) {
    this.clientLog('DEBUG', moduleName, functionName, message, additionalData);
  },

  /**
   * Info level logging (client-side)
   * @param {string} moduleName - Name of the module
   * @param {string} functionName - Name of the function
   * @param {string} message - Log message
   * @param {Object} additionalData - Additional data to log
   */
  infoLog: function(moduleName, functionName, message, additionalData = {}) {
    this.clientLog('INFO', moduleName, functionName, message, additionalData);
  },

  /**
   * Warning level logging (client-side)
   * @param {string} moduleName - Name of the module
   * @param {string} functionName - Name of the function
   * @param {string} message - Log message
   * @param {Object} additionalData - Additional data to log
   */
  warnLog: function(moduleName, functionName, message, additionalData = {}) {
    this.clientLog('WARN', moduleName, functionName, message, additionalData);
  },

  /**
   * Error level logging (client-side)
   * @param {string} moduleName - Name of the module
   * @param {string} functionName - Name of the function
   * @param {string} message - Log message
   * @param {Object} additionalData - Additional data to log
   */
  errorLog: function(moduleName, functionName, message, additionalData = {}) {
    this.clientLog('ERROR', moduleName, functionName, message, additionalData);
  },

  /**
   * Fatal level logging (client-side)
   * @param {string} moduleName - Name of the module
   * @param {string} functionName - Name of the function
   * @param {string} message - Log message
   * @param {Object} additionalData - Additional data to log
   */
  fatalLog: function(moduleName, functionName, message, additionalData = {}) {
    this.clientLog('FATAL', moduleName, functionName, message, additionalData);
  },
  // Legacy compatibility aliases (in case older scripts used these names)
  logDebug: function(...args) { this.debugLog(...args); },
  logInfo: function(...args) { this.infoLog(...args); },
  logWarn: function(...args) { this.warnLog(...args); },
  logError: function(...args) { this.errorLog(...args); },
  logFatal: function(...args) { this.fatalLog(...args); },

  /**
   * Build full URL for API calls
   * @param {string} endpointName - Name of the endpoint from configuration
   * @param {object} queryParameters - Query parameters object
   * @returns {string} - Complete URL for API call
   */
  buildApiUrl: function(endpointName, queryParameters = {}) {
    const MODULE_NAME = 'ApplicationUtilities';
    const FUNCTION_NAME = 'buildApiUrl';
    
    this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Building API URL', { 
      endpointName, 
      queryParameters 
    });
    
    const baseEndpointUrl = ApplicationConfiguration.baseServerUrl + 
                           ApplicationConfiguration.apiEndpoints[endpointName];
    
    if (Object.keys(queryParameters).length === 0) {
      this.debugLog(MODULE_NAME, FUNCTION_NAME, 'API URL built without parameters', { 
        baseEndpointUrl 
      });
      return baseEndpointUrl;
    }
    
    const searchParameters = new URLSearchParams(queryParameters);
    const fullApiUrl = `${baseEndpointUrl}?${searchParameters.toString()}`;
    
    this.debugLog(MODULE_NAME, FUNCTION_NAME, 'API URL built with parameters', { 
      fullApiUrl 
    });
    return fullApiUrl;
  },
  
  /**
   * Safe fetch with comprehensive error handling
   * @param {string} requestUrl - URL to fetch
   * @param {object} requestOptions - Fetch options
   * @returns {Promise<object>} - Response data
   */
  performSafeFetch: async function(requestUrl, requestOptions = {}) {
    const MODULE_NAME = 'ApplicationUtilities';
    const FUNCTION_NAME = 'performSafeFetch';
    
    this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Performing safe fetch request', { 
      requestUrl,
      requestMethod: requestOptions.method || 'GET'
    });
    
    try {
      const fetchResponse = await fetch(requestUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...requestOptions.headers
        },
        ...requestOptions
      });
      
      this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Fetch response received', { 
        status: fetchResponse.status,
        statusText: fetchResponse.statusText
      });
      
      if (!fetchResponse.ok) {
        const errorMessage = `HTTP error! status: ${fetchResponse.status}`;
        this.errorLog(MODULE_NAME, FUNCTION_NAME, 'Fetch request failed', new Error(errorMessage));
        throw new Error(errorMessage);
      }
      
      const responseData = await fetchResponse.json();
      this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Fetch completed successfully');
      
      return responseData;
    } catch (fetchError) {
      this.errorLog(MODULE_NAME, FUNCTION_NAME, 'Fetch operation failed', fetchError);
      throw fetchError;
    }
  },
  
  /**
   * Display user-friendly error message
   * @param {string} errorMessage - Error message to display
   * @param {boolean} allowReload - Whether to offer page reload option
   */
  displayUserError: function(errorMessage, allowReload = true, opts = {}) {
    const MODULE_NAME = 'ApplicationUtilities';
    const FUNCTION_NAME = 'displayUserError';
    this.errorLog(MODULE_NAME, FUNCTION_NAME, 'Displaying user error (floating)', { errorMessage });

    // Prefer existing toast utility if available & positioned; otherwise create custom floating notice
    if (window.toast && typeof window.toast.error === 'function') {
      window.toast.error(errorMessage, { duration: opts.duration || 4800, title: 'Error' });
      return;
    }

    const rootId = 'floating-error-root';
    let root = document.getElementById(rootId);
    if (!root) {
      root = document.createElement('div');
      root.id = rootId;
      root.className = 'floating-error-root';
      document.body.appendChild(root);
    }

    const notice = document.createElement('div');
    notice.className = 'floating-error-notice';
    notice.setAttribute('role', 'status');
    notice.innerHTML = `
      <div class="fe-content">
        <div class="fe-title">Error</div>
        <div class="fe-text"></div>
        <div class="fe-actions"></div>
        <button class="fe-close" aria-label="Dismiss">✕</button>
      </div>`;
    notice.querySelector('.fe-text').textContent = errorMessage;

    const actions = notice.querySelector('.fe-actions');
    if (allowReload) {
      const reloadBtn = document.createElement('button');
      reloadBtn.type = 'button';
      reloadBtn.className = 'fe-btn fe-reload';
      reloadBtn.textContent = 'Reload';
      reloadBtn.onclick = () => window.location.reload();
      actions.appendChild(reloadBtn);
    }
    const closeBtn = notice.querySelector('.fe-close');
    const dismiss = () => {
      if (notice.dataset.closing) return;
      notice.dataset.closing = 'true';
      notice.classList.add('closing');
      setTimeout(() => notice.remove(), 320);
    };
    closeBtn.addEventListener('click', dismiss);

    const ttl = opts.duration || 4800;
    if (ttl > 0) setTimeout(dismiss, ttl);

    root.appendChild(notice);
    // Force reflow then animate in
    requestAnimationFrame(() => notice.classList.add('enter'));
  },

  /**
   * Create the error overlay element
   * @returns {HTMLElement} - The created error overlay
   */
  /* Deprecated overlay creation retained for backward compatibility (not used now) */
  createErrorOverlay: function() {
    const overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.className = 'error-overlay';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    
    errorMessage.innerHTML = `
      <div class="error-title">⚠️ Error</div>
      <div class="error-text"></div>
      <div class="error-actions"></div>
    `;
    
    overlay.appendChild(errorMessage);
    document.body.appendChild(overlay);
    
    // Allow clicking outside to dismiss
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideErrorOverlay();
      }
    });
    
    return overlay;
  },

  /**
   * Show the error overlay
   */
  showErrorOverlay: function() {
    const overlay = document.getElementById('error-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  },

  /**
   * Hide the error overlay
   */
  hideErrorOverlay: function() {
    const overlay = document.getElementById('error-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  },
  
  /**
   * Format text for user-friendly display
   * @param {string} rawText - Text to format
   * @returns {string} - Formatted text
   */
  formatDisplayText: function(rawText) {
    const MODULE_NAME = 'ApplicationUtilities';
    const FUNCTION_NAME = 'formatDisplayText';
    
    this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Formatting display text', { rawText });
    
    const formattedText = rawText
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, character => character.toUpperCase());
    
    this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Text formatting completed', { formattedText });
    return formattedText;
  },

  /**
   * Validate and sanitize user input
   * @param {string} userInput - Input to validate
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} - Sanitized input
   */
  sanitizeUserInput: function(userInput, maxLength = 255) {
    const MODULE_NAME = 'ApplicationUtilities';
    const FUNCTION_NAME = 'sanitizeUserInput';
    
    this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Sanitizing user input', { 
      inputLength: userInput?.length,
      maxLength 
    });
    
    if (typeof userInput !== 'string') {
      this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Input is not a string, returning empty');
      return '';
    }
    
    const sanitizedInput = userInput.trim().substring(0, maxLength);
    this.debugLog(MODULE_NAME, FUNCTION_NAME, 'Input sanitization completed', { 
      sanitizedLength: sanitizedInput.length 
    });
    
    return sanitizedInput;
  }
};

// Initialize frontend logging
ApplicationUtilities.debugLog('ApplicationConfiguration', 'INIT', 'Frontend configuration and utilities loaded successfully');
