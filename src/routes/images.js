const express = require('express');
const path = require("path");
const fs = require("fs");
const router = express.Router();

const imagesPath = path.join(__dirname, "../../../mnt/models");

// Route to serve a random WebP image
router.get("/media/homepage", (req, res) => {
    try {
      const images = getAllWebPImages(imagesPath);
  
      if (images.length === 0) {
        return res.status(404).send("No images found");
      }
  
      const randomImage = images[Math.floor(Math.random() * images.length)];
      const fileData = fs.readFileSync(randomImage);
  
      res.set("Content-Type", "image/webp");
      res.send(fileData);
    } catch (err) {
      console.error("Error accessing images:", err);
      res.status(500).send("Internal server error");
    }
  });
  
  // Route to serve a specific WebP image
  router.get("/media/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const categoryPath = path.join(imagesPath, category); // Path to the file on the SMB share
      const images = getAllWebPImages(categoryPath);
  
      if (images.length === 0) {
        return res.status(404).send("No images found");
      }
  
      const randomImage = images[Math.floor(Math.random() * images.length)];
      const fileData = fs.readFileSync(randomImage);
  
      res.set("Content-Type", "image/webp");
      res.send(fileData);
    } catch (err) {
      console.error("Error accessing images:", err);
      res.status(500).send("Internal server error");
    }
  });
  
  // Function to get all WebP image file paths from a directory and subdirectories
  const getAllWebPImages = (dir) => {
    let results = [];
    const files = fs.readdirSync(dir);
  
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
  
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllWebPImages(fullPath));
      } else if (file.endsWith(".webp")) {
        results.push(fullPath);
      }
    }
  
    return results;
  };

module.exports = router;
