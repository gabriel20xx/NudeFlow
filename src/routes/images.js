// routes/images.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const contentPath = path.join(__dirname, "../../../mnt/images");

// Route to serve a random WebP image
router.get("/homepage", (req, res) => {
  try {
    const content = getAllContent(contentPath);

    if (images.length === 0) {
      return res.status(404).send("No images found");
    }

    const randomContent = content[Math.floor(Math.random() * content.length)];
    const fileData = fs.readFileSync(randomContent);

    res.set("Content-Type", "video/mp4");
    res.send(fileData);
  } catch (err) {
    console.error("Error accessing content:", err);
    res.status(500).send("Internal server error");
  }
});

// Route to serve a specific WebP image
router.get("/:category", async (req, res) => {
  try {
    const category = req.params.category;
    const categoryPath = path.join(contentPath, category); // Path to the file on the SMB share
    const content = getAllContent(categoryPath);

    if (content.length === 0) {
      return res.status(404).send("No images found");
    }

    const randomContent = content[Math.floor(Math.random() * content.length)];
    const fileData = fs.readFileSync(randomContent);

    res.set("Content-Type", "video/mp4");
    res.send(fileData);
  } catch (err) {
    console.error("Error accessing content:", err);
    res.status(500).send("Internal server error");
  }
});

// Function to get all WebP image file paths from a directory and subdirectories
const getAllContent = (dir) => {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllContent(fullPath));
    } else if (file.endsWith("-audio.mp4")) {
      results.push(fullPath);
    }
  }

  return results;
};

module.exports = router;
