// /app/xxxtok/src/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const appPort = 5000;
const mongoDBIP = "192.168.2.94";
const mongoDBPort = "27017";
const mongoDBName = "xxxtok";

app.use(cors());
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Home Page" });
});

const imagesRoutes = require("./routes/images");
const tabsRoutes = require("./routes/tabs");
const routesAPI = require("./api/routesApi");  // Update the path to the correct location
const { setupDynamicRoutes } = require("./controllers/dynamicRoutesController");

app.use("/images", imagesRoutes);
app.use("/tabs", tabsRoutes);
routesAPI(app);  // Pass the app instance to the routes

// Setup dynamic routes
setupDynamicRoutes(app);

mongoose
  .connect(`mongodb://${mongoDBIP}:${mongoDBPort}/${mongoDBName}`)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Failed to connect to MongoDB", err));

app.listen(appPort, () => {
  console.log("Server is running on port", appPort);
});
