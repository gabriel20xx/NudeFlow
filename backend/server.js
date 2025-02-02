const express = require("express");
const mongoose = require("mongoose");
const sharp = require("sharp");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const Video = require("./models/video");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://192.168.2.94:27017/xxxtok")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Failed to connect to MongoDB", err));

app.use(express.static(path.join(__dirname, "..", "frontend")));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

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

// Route to serve compressed WebP images dynamically
app.get("/api/webp", async (req, res) => {
  const { url, width = 600, quality = 80 } = req.query; // Default values

  // Fetch image file (assuming local storage, but can be a remote fetch)
  const prefix = "ComfyUI_";
  const suffix = "_";
  const modifiedUrl = prefix + url + suffix;
  const imagePath = path.resolve(__dirname, "media", modifiedUrl);
  console.log("Image Path:", imagePath);
  if (!fs.existsSync(imagePath)) {
    return res.status(404).send("Image not found. Image Path: " + imagePath);
  }

  try {
    // Convert & compress WebP dynamically
    const imageBuffer = await sharp(imagePath)
      .resize(parseInt(width))
      .webp({ quality: parseInt(quality) })
      .toBuffer();

    res.set("Content-Type", "image/webp");
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).send("Error processing image");
  }
});

// Start the server
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
