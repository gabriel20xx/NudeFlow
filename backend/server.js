// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const sharp = require("sharp");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const SambaClient = require('samba-client');

const app = express();
app.use(cors());
app.use(express.json());

// Configure SMB connection
let clientGenerated = new SambaClient({
  address: '//192.168.2.5/Generated', // SMB share path
  username: 'gabriel',
  password: 'KingPong31:)',
});

let clientModels = new SambaClient({
  address: '//192.168.2.5/Models', // SMB share path
  username: 'gabriel',
  password: 'KingPong31:)',
});

mongoose
  .connect("mongodb://192.168.2.94:27017/xxxtok")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Failed to connect to MongoDB", err));

const staticPath = path.join(__dirname, "..", "frontend");

// Function to get filenames dynamically
async function getRouteNames() {
  try {
    const output = await clientModels.execute("ls SDXL/Loras"); // List files
    let files = output.split("\n").map(f => f.trim()).filter((f) => f && !f.endsWith(":")); // Remove empty lines & directory headers;

    // Remove file extensions
    let routes = files.map(f => "/" + path.parse(f).name);
    return routes;
  } catch (err) {
    console.error("Error retrieving files from SMB:", err);
    return [];
  }
}

// Set up routes dynamically
getRouteNames().then(routes => {
  routes.forEach(route => {
    app.use(route, express.static(staticPath, { extensions: ["html"] }));
  });

  console.log("Routes set up:", routes);
});

// Route to serve a specific WebP image
app.get('/media/:category/:name', async (req, res) => {
  const category = req.params.category;
  const imageName = req.params.name + '.webp';
  const smbPath = path.join('ComfyUI', category, imageName);  // Path to the file on the SMB share

  try {
    // Fetch the file from the SMB share
    const localPath = path.join(__dirname, 'media', imageName); // Temporary local path to save the file
    await clientGenerated.getFile(smbPath, localPath); // Download the file to local disk

    // Read the file and send it as a response
    const fileData = fs.readFileSync(localPath);
    res.set('Content-Type', 'image/webp');
    res.send(fileData); // Send the image data from the local disk

    // Clean up the temporary file after sending it
    fs.unlinkSync(localPath);
  } catch (err) {
    console.error('Error retrieving file from SMB share:', err);
    res.status(404).send('Image not found');
  }
});

// Route to serve a specific WebP image
app.get('/media/:name', async (req, res) => {
  const imageName = req.params.name + '.webp';
  const smbPath = 'ComfyUI/' + imageName;  // Path to the file on the SMB share

  try {
    // Fetch the file from the SMB share
    const localPath = path.join(__dirname, 'media', imageName); // Temporary local path to save the file
    await clientGenerated.getFile(smbPath, localPath); // Download the file to local disk

    // Read the file and send it as a response
    const fileData = fs.readFileSync(localPath);
    res.set('Content-Type', 'image/webp');
    res.send(fileData); // Send the image data from the local disk

    // Clean up the temporary file after sending it
    fs.unlinkSync(localPath);
  } catch (err) {
    console.error('Error retrieving file from SMB share:', err);
    res.status(404).send('Image not found');
  }
});

// Start the server
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
