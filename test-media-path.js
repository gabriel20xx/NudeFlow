// Quick test for media path resolution
const path = require('path');

// Simulate the media service environment
const MEDIA_PATH = process.env.MEDIA_PATH || '../media';
const PROJECT_ROOT = path.resolve(__dirname, '../');

const getMediaDirectory = () => {
  return path.resolve(PROJECT_ROOT, MEDIA_PATH);
};

console.log('Current directory:', __dirname);
console.log('Project root:', PROJECT_ROOT);
console.log('Media path env var:', MEDIA_PATH);
console.log('Resolved media directory:', getMediaDirectory());

// Test a relative path resolution
const testRelativePath = 'homepage';
const absolutePath = path.join(getMediaDirectory(), testRelativePath);
console.log('Test absolute path for "homepage":', absolutePath);
