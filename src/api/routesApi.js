// /my-app/src/routes/routes.js
const fs = require("fs");
const path = require("path");

const modelsPath = path.join(__dirname, "../../../mnt/models"); // Adjust path if necessary

// Endpoint to fetch available route names dynamically
module.exports = function(app) {
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
};
