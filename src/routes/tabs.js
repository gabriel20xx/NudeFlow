const express = require('express');
const path = require("path");
const router = express.Router();

router.use(express.static(path.join(__dirname, '../public'))); // For serving static files like CSS, JS

router.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

router.get("/categories", (req, res) => {
  res.render("categories", { title: "Categories" });
});

router.get("/search", (req, res) => {
  res.render("search", { title: "Search" });
});

router.get("/categories", (req, res) => {
  res.render("categories", { title: "Categories" });
});

router.get("/categories", (req, res) => {
  res.render("categories", { title: "Categories" });
});

module.exports = router;
