const express = require("express");
const fs = require("fs");
const path = require("path");
const modelsPath = path.join(__dirname, "../../../mnt/models"); // Adjust path if needed

const app = express();

// Function to get all route names from subfolders
const getRouteNames = () => {
  return fs
    .readdirSync(modelsPath) // Read subdirectories (hunyuan, wan)
    .flatMap((subfolder) => {
      const subfolderPath = path.join(modelsPath, subfolder);
      if (fs.statSync(subfolderPath).isDirectory()) {
        return fs.readdirSync(subfolderPath).map((file) =>
          path.basename(file, path.extname(file))
        );
      }
      return [];
    });
};

// Function to dynamically add routes
const setupDynamicRoutes = (app) => {
  const routeNames = getRouteNames();
  routeNames.forEach((route) => {
    app.get(`/${route}`, (req, res) => {
      res.render("index", { title: `Page for ${route}` });
    });
  });
  console.log("Dynamic routes added:", routeNames);
};
module.exports = { setupDynamicRoutes };
