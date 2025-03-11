// /my-app/src/routes/routes.js
const path = require("path");
const fs = require("fs");

const modelsPath = path.join(__dirname, "../../../mnt/models"); // Adjust path if necessary

// Endpoint to fetch available route names dynamically
module.exports = function (app) {
  app.get("/api/routes", (req, res) => {
    const routes = [];

    // Read subdirectories inside modelsPath
    fs.readdirSync(modelsPath).forEach((subfolder) => {
      const subfolderPath = path.join(modelsPath, subfolder);
      if (fs.statSync(subfolderPath).isDirectory()) {
        // Read filenames from subfolder and add them to routes
        fs.readdirSync(subfolderPath).forEach((file) => {
          const route = path.basename(file, path.extname(file)); // Strip extension
          routes.push(route);
        });
      }
    });

    console.log(routes);
    res.json(routes); // Send the list of routes as JSON
  });
};
