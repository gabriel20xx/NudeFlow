// Simple test to verify everything is working
const express = require('express');
const path = require('path');

console.log('🔍 Testing environment configuration...');

// Test environment variables
console.log('PORT:', process.env.PORT || 3000);
console.log('MEDIA_PATH:', process.env.MEDIA_PATH || '../media');
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN || '*');

// Test path resolution
const PROJECT_ROOT = path.resolve(__dirname);
const MEDIA_PATH = process.env.MEDIA_PATH || '../media';
const mediaDirectory = path.resolve(PROJECT_ROOT, MEDIA_PATH);

console.log('Project root:', PROJECT_ROOT);
console.log('Resolved media directory:', mediaDirectory);

// Test media service
console.log('🔍 Testing media service...');
const mediaService = require('./src/services/mediaService');

mediaService.initializeMediaService()
  .then(() => {
    console.log('✅ Media service initialized successfully');
    console.log('Categories found:', mediaService.getCategories().length);
    console.log('Media files found:', mediaService.getAllMedia().length);
    
    if (mediaService.getAllMedia().length > 0) {
      console.log('Sample media:', mediaService.getAllMedia()[0]);
    }
    
    console.log('🎉 All tests passed! Configuration is working correctly.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error during testing:', error);
    process.exit(1);
  });
