const fs = require("fs");
const path = require("path");
const modelsPath = path.join(__dirname, "../../../mnt/models"); // Adjust path if needed

// Function to get route names from filenames
const getRouteNames = () => {
  return fs
    .readdirSync(modelsPath)
    .map((file) => path.basename(file, path.extname(file)));
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
