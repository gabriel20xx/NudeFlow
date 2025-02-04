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

const staticPath = path.join(__dirname, '../frontend');
const modelsPath = path.join(__dirname, '../../mnt/models');
const imagesPath = path.join(__dirname, '../../mnt/images');

// Read the filenames in the directory
fs.readdirSync(modelsPath).forEach(file => {
  // Get the route by stripping the extension from the filename
  const route = '/' + path.basename(file, path.extname(file));
  
  // Use the route for serving static files
  app.use(route, express.static(staticPath, { extensions: ['html'] }));
});

// Serve static files like CSS and JS from the frontend folder
app.use(express.static(staticPath));

// Serve the index.html file for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

// Endpoint to fetch available route names dynamically
app.get('/api/routes', (req, res) => {
  const routes = [];

  // Read the filenames in the models directory and create route names
  fs.readdirSync(modelsPath).forEach(file => {
    const route = path.basename(file, path.extname(file));  // Strip extension to get the route
    routes.push(route);
  });
  console.log(routes);

  res.json(routes);  // Send the list of routes as JSON
});

// Route to serve a specific WebP image
app.get('/media/:category/:name', async (req, res) => {
  const category = req.params.category;
  const imageName = req.params.name + '.webp';
  const localPath = path.join(imagesPath, category, imageName);  // Path to the file on the SMB share

  try {
    // Read the file and send it as a response
    const fileData = fs.readFileSync(localPath);
    res.set('Content-Type', 'image/webp');
    res.send(fileData); // Send the image data from the local dis
  } catch (err) {
    console.error('Error accessing the file:', err);
    res.status(404).send('Image not found');
  }
});

// Route to serve a specific WebP image
app.get('/media/:name', async (req, res) => {
  const imageName = req.params.name + '.webp';
  const localPath = path.join(imagesPath, imageName);
  
  try {
    // Read the file and send it as a response
    const fileData = fs.readFileSync(localPath);
    res.set('Content-Type', 'image/webp');
    res.send(fileData); // Send the image data from the local disk
  } catch (err) {
    console.error('Error accessing the file:', err);
    res.status(404).send('Image not found');
  }
});

// Start the server
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
