const express = require('express');
const mongoose = require('mongoose');
const sharp = require('sharp');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const Video = require('./models/video');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://192.168.2.94:27017/xxxtok', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('Failed to connect to MongoDB', err));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', async (req, res) => {
    res.status(200).send('Webpage is running');
})

// Route to serve compressed WebP images dynamically
app.get('/api/webp', async (req, res) => {
    const { url, width = 600, quality = 80 } = req.query; // Default values

    // Fetch image file (assuming local storage, but can be a remote fetch)
    const prefix = 'ComfyUI_'
    const suffix = '_.webp'
    const modifiedUrl = prefix + url + suffix;
    const imagePath = path.resolve(__dirname, 'media', modifiedUrl); 
    console.log('Image Path:', imagePath);
    if (!fs.existsSync(imagePath)) {
        return res.status(404).send('Image not found. Image Path: ' + imagePath);
        }

    try {
    // Convert & compress WebP dynamically
    const imageBuffer = await sharp(imagePath)
        .resize(parseInt(width))
        .webp({ quality: parseInt(quality) })
        .toBuffer();

    res.set('Content-Type', 'image/webp');
    res.send(imageBuffer);
    } catch (error) {
        res.status(500).send('Error processing image');
    }
});

// API to fetch videos
app.get('/api/videos', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
  
    try {
      const videos = await Video.find().skip(skip).limit(limit);
      res.json({ videos });
    } catch (err) {
      res.status(500).send('Error loading videos');
    }
  });
  

// Start the server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
