// Utility functions for the application (ESM)
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import Logger from './logger.js';

class AppUtils {
  /**
   * Log levels for severity classification
   */
  static LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL'
  };

  /**
   * Universal logger with severity levels (server-side)
   * @param {string} severity - Log severity level
   * @param {string} moduleName - Name of the module/file
   * @param {string} functionName - Name of the function
   * @param {string} message - Log message
   * @param {object} data - Optional data to log
   */
  static log(severity, moduleName, functionName, message, data = null) {
    const lvl = severity.toUpperCase();
    const msg = `[${functionName}] ${message}`;
    const args = data ? [data] : [];
    switch (lvl) {
      case this.LOG_LEVELS.DEBUG: return Logger.debug(moduleName, msg, ...args);
      case this.LOG_LEVELS.INFO: return Logger.info(moduleName, msg, ...args);
      case this.LOG_LEVELS.WARN: return Logger.warn(moduleName, msg, ...args);
      case this.LOG_LEVELS.ERROR: return Logger.error(moduleName, msg, ...args);
      case this.LOG_LEVELS.FATAL: return Logger.error(moduleName, `[FATAL] ${msg}`, ...args);
      default: return Logger.info(moduleName, msg, ...args);
    }
  }

  /**
   * Debug logger for detailed debugging information (server-side)
   * @param {string} moduleName - Name of the module/file
   * @param {string} functionName - Name of the function
   * @param {string} message - Debug message
   * @param {object} data - Optional data to log
   */
  static debugLog(moduleName, functionName, message, data = null) {
    this.log(this.LOG_LEVELS.DEBUG, moduleName, functionName, message, data);
  }

  /**
   * Info logger for general information (server-side)
   * @param {string} moduleName - Name of the module/file
   * @param {string} functionName - Name of the function
   * @param {string} message - Info message
   * @param {object} data - Optional data to log
   */
  static infoLog(moduleName, functionName, message, data = null) {
    this.log(this.LOG_LEVELS.INFO, moduleName, functionName, message, data);
  }

  /**
   * Warning logger for potential issues (server-side)
   * @param {string} moduleName - Name of the module/file
   * @param {string} functionName - Name of the function
   * @param {string} message - Warning message
   * @param {object} data - Optional data to log
   */
  static warnLog(moduleName, functionName, message, data = null) {
    this.log(this.LOG_LEVELS.WARN, moduleName, functionName, message, data);
  }

  /**
   * Error logger for error conditions (server-side)
   * @param {string} moduleName - Name of the module/file
   * @param {string} functionName - Name of the function
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {object} additionalData - Additional context data
   */
  static errorLog(moduleName, functionName, message, error = null, additionalData = {}) {
    const logData = {
      module: moduleName,
      function: functionName,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      ...additionalData
    };
    
    this.log(this.LOG_LEVELS.ERROR, moduleName, functionName, message, logData);
  }

  /**
   * Fatal logger for critical system failures (server-side)
   * @param {string} moduleName - Name of the module/file
   * @param {string} functionName - Name of the function
   * @param {string} message - Fatal error message
   * @param {Error} error - Error object
   * @param {object} additionalData - Additional context data
   */
  static fatalLog(moduleName, functionName, message, error = null, additionalData = {}) {
    const logData = {
      module: moduleName,
      function: functionName,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      ...additionalData
    };
    
    this.log(this.LOG_LEVELS.FATAL, moduleName, functionName, message, logData);
  }

  /**
   * Validate if a file path is safe (no directory traversal)
   * @param {string} filePath - The file path to validate
   * @returns {boolean} - True if safe, false otherwise
   */
  static validateFilePath(filePath) {
    AppUtils.debugLog('AppUtils', 'validateFilePath', 'Validating file path', { filePath });
    const normalizedPath = path.normalize(filePath);
    const isValid = !normalizedPath.includes('..');
    AppUtils.debugLog('AppUtils', 'validateFilePath', 'Path validation result', { isValid });
    return isValid;
  }

  /**
   * Validate if a string contains only safe characters
   * @param {string} inputString - The input to validate
   * @returns {boolean} - True if safe, false otherwise
   */
  static validateInputString(inputString) {
    AppUtils.debugLog('AppUtils', 'validateInputString', 'Validating input string', { inputString });
    const isValid = /^[a-zA-Z0-9_-]+$/.test(inputString);
    AppUtils.debugLog('AppUtils', 'validateInputString', 'Input validation result', { isValid });
    return isValid;
  }

  /**
   * Check if a file exists synchronously
   * @param {string} filePath - The file path to check
   * @returns {boolean} - True if exists, false otherwise
   */
  static checkFileExists(filePath) {
    AppUtils.debugLog('AppUtils', 'checkFileExists', 'Checking file existence', { filePath });
    try {
      const exists = fsSync.existsSync(filePath);
      AppUtils.debugLog('AppUtils', 'checkFileExists', 'File existence check result', { exists });
      return exists;
    } catch (error) {
      AppUtils.errorLog('AppUtils', 'checkFileExists', 'Error checking file existence', error, { filePath });
      return false;
    }
  }

  /**
   * Get file statistics safely
   * @param {string} filePath - The file path
   * @returns {Promise<object|null>} - File stats or null if error
   */
  static async getFileStatistics(filePath) {
    AppUtils.debugLog('AppUtils', 'getFileStatistics', 'Getting file statistics', { filePath });
    try {
      const stats = await fs.stat(filePath);
      AppUtils.debugLog('AppUtils', 'getFileStatistics', 'Successfully retrieved file stats', { 
        size: stats.size, 
        isDirectory: stats.isDirectory() 
      });
      return stats;
    } catch (error) {
      AppUtils.errorLog('AppUtils', 'getFileStatistics', 'Error getting file statistics', error, { filePath });
      return null;
    }
  }

  /**
   * Read directory contents safely
   * @param {string} directoryPath - The directory path
   * @returns {Promise<string[]>} - Array of filenames or empty array if error
   */
  static async readDirectoryContents(directoryPath) {
    AppUtils.debugLog('AppUtils', 'readDirectoryContents', 'Reading directory contents', { directoryPath });
    try {
      const files = await fs.readdir(directoryPath);
      AppUtils.debugLog('AppUtils', 'readDirectoryContents', 'Successfully read directory', { 
        fileCount: files.length 
      });
      return files;
    } catch (error) {
      AppUtils.errorLog('AppUtils', 'readDirectoryContents', 'Error reading directory', error, { directoryPath });
      return [];
    }
  }

  /**
   * Format route name for display
   * @param {string} routeName - The route name
   * @returns {string} - Formatted route name
   */
  static formatRouteNameForDisplay(routeName) {
    AppUtils.debugLog('AppUtils', 'formatRouteNameForDisplay', 'Formatting route name', { routeName });
    const formattedName = routeName
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
    AppUtils.debugLog('AppUtils', 'formatRouteNameForDisplay', 'Route name formatted', { formattedName });
    return formattedName;
  }

  /**
   * Get file extension
   * @param {string} fileName - The file name
   * @returns {string} - File extension
   */
  static extractFileExtension(fileName) {
    AppUtils.debugLog('AppUtils', 'extractFileExtension', 'Extracting file extension', { fileName });
    const extension = path.extname(fileName).toLowerCase();
    AppUtils.debugLog('AppUtils', 'extractFileExtension', 'File extension extracted', { extension });
    return extension;
  }

  /**
   * Check if file is a valid media file (supports videos, animated images, and static images)
   * @param {string} fileName - The file name
   * @param {string[]} allowedFileTypes - Array of allowed extensions
   * @returns {boolean} - True if valid media file
   */
  static validateMediaFileType(fileName, allowedFileTypes = [
    // Video formats
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v',
    // Animated image formats
    '.gif', '.webp',
    // Static image formats
    '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.svg', '.ico'
  ]) {
    AppUtils.debugLog('AppUtils', 'validateMediaFileType', 'Validating media file type', { 
      fileName, 
      allowedFileTypes 
    });
    const extension = this.extractFileExtension(fileName);
    const isValid = allowedFileTypes.includes(extension);
    AppUtils.debugLog('AppUtils', 'validateMediaFileType', 'Media file validation result', { 
      isValid,
      fileType: this.getMediaType(fileName)
    });
    return isValid;
  }

  /**
   * Get media type category (video, animated, static)
   * @param {string} fileName - The file name
   * @returns {string} - Media type category
   */
  static getMediaType(fileName) {
    AppUtils.debugLog('AppUtils', 'getMediaType', 'Determining media type category', { fileName });
    
    const extension = this.extractFileExtension(fileName);
    const mediaTypeMap = {
      // Video formats
      '.mp4': 'video',
      '.avi': 'video',
      '.mov': 'video',
      '.wmv': 'video',
      '.flv': 'video',
      '.webm': 'video',
      '.mkv': 'video',
      '.m4v': 'video',
      // Animated image formats
      '.gif': 'animated',
      '.webp': 'animated', // WebP can be animated or static, treating as animated
      // Static image formats
      '.jpg': 'static',
      '.jpeg': 'static',
      '.png': 'static',
      '.bmp': 'static',
      '.tiff': 'static',
      '.svg': 'static',
      '.ico': 'static'
    };
    
    const mediaType = mediaTypeMap[extension] || 'unknown';
    AppUtils.debugLog('AppUtils', 'getMediaType', 'Media type determined', { mediaType });
    return mediaType;
  }

  /**
   * Get MIME type for file (enhanced for all media types)
   * @param {string} fileName - The file name
   * @returns {string} - MIME type
   */
  static determineMimeType(fileName) {
    AppUtils.debugLog('AppUtils', 'determineMimeType', 'Determining MIME type', { fileName });
    const extension = this.extractFileExtension(fileName);
    const mimeTypeMap = {
      // Video formats
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.m4v': 'video/x-m4v',
      // Animated image formats
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      // Static image formats
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    const mimeType = mimeTypeMap[extension] || 'application/octet-stream';
    AppUtils.debugLog('AppUtils', 'determineMimeType', 'MIME type determined', { mimeType });
    return mimeType;
  }

  /**
   * Sanitize user input
   * @param {string} userInput - The input to sanitize
   * @param {number} maxInputLength - Maximum allowed length
   * @returns {string} - Sanitized input
   */
  static sanitizeUserInput(userInput, maxInputLength = 255) {
    AppUtils.debugLog('AppUtils', 'sanitizeUserInput', 'Sanitizing user input', { 
      originalLength: userInput?.length,
      maxInputLength 
    });
    
    if (typeof userInput !== 'string') {
      AppUtils.debugLog('AppUtils', 'sanitizeUserInput', 'Input is not a string, returning empty string');
      return '';
    }
    
    const sanitizedInput = userInput.trim().substring(0, maxInputLength);
    AppUtils.debugLog('AppUtils', 'sanitizeUserInput', 'Input sanitized', { 
      sanitizedLength: sanitizedInput.length 
    });
    return sanitizedInput;
  }

  /**
   * Create standardized error response object
   * @param {string} errorMessage - Error message
   * @param {number} httpStatusCode - HTTP status code
   * @returns {object} - Error response object
   */
  static createErrorResponse(errorMessage, httpStatusCode = 500) {
    AppUtils.debugLog('AppUtils', 'createErrorResponse', 'Creating error response', { 
      errorMessage, 
      httpStatusCode 
    });
    
    const errorResponse = {
      error: errorMessage,
      statusCode: httpStatusCode,
      timestamp: new Date().toISOString()
    };
    
    AppUtils.debugLog('AppUtils', 'createErrorResponse', 'Error response created', errorResponse);
    return errorResponse;
  }

  /**
   * Create standardized success response object
   * @param {object} responseData - Response data
   * @param {string} successMessage - Success message
   * @returns {object} - Success response object
   */
  static createSuccessResponse(responseData, successMessage = 'Operation successful') {
    AppUtils.debugLog('AppUtils', 'createSuccessResponse', 'Creating success response', { 
      successMessage,
      dataKeys: Object.keys(responseData || {})
    });
    
    const successResponse = {
      success: true,
      message: successMessage,
      data: responseData,
      timestamp: new Date().toISOString()
    };
    
    AppUtils.debugLog('AppUtils', 'createSuccessResponse', 'Success response created');
    return successResponse;
  }
}

export default AppUtils;
