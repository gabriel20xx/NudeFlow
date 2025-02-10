// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const sharp = require("sharp");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb://192.168.2.94:27017/xxxtok")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Failed to connect to MongoDB", err));

const staticPath = path.join(__dirname, "public");
const modelsPath = path.join(__dirname, "../../mnt/models");
const imagesPath = path.join(__dirname, "../../mnt/images");

// Read the filenames in the directory
fs.readdirSync(modelsPath).forEach((file) => {
  // Get the route by stripping the extension from the filename
  const route = "/" + path.basename(file, path.extname(file));

  // Use the route for serving static files
  app.use(route, express.static(staticPath, { extensions: ["html"] }));
});

app.set("view engine", "ejs");
app.use(express.static("public")); // For serving static files like CSS, JS
app.get("/", (req, res) => res.render("home")); // Default route

app.get("/:page", (req, res) => {
  res.render("layout", { page: req.params.page }, (err, html) => {
    if (err) return res.status(404).send("<h2>Page Not Found</h2>");
    res.send(html);
  });
});

// Endpoint to fetch available route names dynamically
app.get("/api/routes", (req, res) => {
  const routes = [];

  // Read the filenames in the models directory and create route names
  fs.readdirSync(modelsPath).forEach((file) => {
    const route = path.basename(file, path.extname(file)); // Strip extension to get the route
    routes.push(route);
  });
  console.log(routes);

  res.json(routes); // Send the list of routes as JSON
});

// Route to serve a random WebP image
app.get("/media/homepage", (req, res) => {
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
app.get("/media/:category", async (req, res) => {
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

// Start the server
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
