// Test script to verify homepage media functionality
const mediaService = require('./src/services/mediaService');
const path = require('path');

console.log('🔍 Testing homepage media functionality...\n');

// Test media service initialization
mediaService.initializeMediaService()
  .then(() => {
    console.log('✅ Media service initialized successfully');
    
    // Check if homepage category exists
    const categories = mediaService.getCategories();
    console.log('📁 Available categories:', categories.map(c => c.name));
    
    const homepageCategory = categories.find(c => c.name === 'homepage');
    if (!homepageCategory) {
      console.log('❌ Homepage category not found!');
      return;
    }
    
    console.log('✅ Homepage category found:', homepageCategory.displayName);
    
    // Test getting random media from homepage
    const randomMedia = mediaService.getRandomMedia('homepage');
    if (!randomMedia) {
      console.log('❌ No media found in homepage category!');
      return;
    }
    
    console.log('✅ Random homepage media found:');
    console.log('   📄 Name:', randomMedia.name);
    console.log('   📁 Category:', randomMedia.category);
    console.log('   🎯 Media Type:', randomMedia.mediaType);
    console.log('   📍 Relative Path:', randomMedia.relativePath);
    console.log('   🌐 MIME Type:', randomMedia.mimeType);
    
    // Test media path resolution
    const absolutePath = mediaService.getMediaPath(randomMedia.relativePath);
    console.log('   💾 Absolute Path:', absolutePath);
    
    // Check if file exists
    const fs = require('fs');
    if (fs.existsSync(absolutePath)) {
      const stats = fs.statSync(absolutePath);
      console.log('   📊 File Size:', (stats.size / 1024).toFixed(2), 'KB');
      console.log('✅ Media file exists and is accessible');
    } else {
      console.log('❌ Media file does not exist at resolved path!');
    }
    
    // Test all media in homepage
    const allMedia = mediaService.getAllMedia().filter(m => m.category === 'homepage');
    console.log(`\n📊 Total homepage media files: ${allMedia.length}`);
    
    if (allMedia.length > 0) {
      console.log('📋 Media types breakdown:');
      const typeCount = allMedia.reduce((acc, media) => {
        acc[media.mediaType] = (acc[media.mediaType] || 0) + 1;
        return acc;
      }, {});
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} files`);
      });
    }
    
    console.log('\n🎉 Homepage media test completed successfully!');
    console.log('\n💡 Homepage should now work with:');
    console.log('   - Images will display as <img> elements');
    console.log('   - Videos will display as <video> elements');
    console.log('   - Media served from:', path.dirname(absolutePath));
    
  })
  .catch((error) => {
    console.error('❌ Error during homepage media test:', error);
  });
