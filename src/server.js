// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const sharp = require("sharp");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const port = 5000;

const staticPath = path.join(__dirname, "public");
const modelsPath = path.join(__dirname, "../../mnt/models");
const imagesPath = path.join(__dirname, "../../mnt/models");

const app = express();
app.use(cors());
app.use(express.json());

const imagesRoutes = require('./routes/images');
app.use('/images', imagesRoutes);

mongoose
  .connect("mongodb://192.168.2.94:27017/xxxtok")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Failed to connect to MongoDB", err));

// Read the filenames in the directory
fs.readdirSync(modelsPath).forEach((file) => {
  // Get the route by stripping the extension from the filename
  const route = "/" + path.basename(file, path.extname(file));

  // Use the route for serving static files
  app.use(route, express.static(staticPath, { extensions: ["html"] }));
});

app.set("view engine", "ejs");

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

// Start the server
app.listen(port, () => {
  console.log("Server is running on port 5000");
});
