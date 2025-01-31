const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect('mongodb://192.168.2.94:27017/xxxtok', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define the Schema & Model
const VideoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  description: { type: String, required: false },
  duration: { type: Number, required: false }  // Optional: Set duration if known
});

const Video = mongoose.model('Video', VideoSchema);

// Folder containing WebP images
const webpFolder = path.join(__dirname, 'media');  // Change this to your folder

// Function to insert images into the database
async function insertWebpImages() {
  try {
    const files = fs.readdirSync(webpFolder).filter(file => file.endsWith('.webp'));

    if (files.length === 0) {
      console.log('No WebP images found.');
      return;
    }

    const videoDocs = files.map(file => ({
      url: `${file}`,  // Modify if using another path for serving files
      description: `WebP image ${file}`,
      duration: 3000  // Default 3 seconds, modify as needed
    }));

    await Video.insertMany(videoDocs);
    console.log(`Inserted ${videoDocs.length} WebP images into the database.`);
  } catch (error) {
    console.error('Error inserting WebP images:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
insertWebpImages();
