const express = require('express');
const path = require("path");
const router = express.Router();

router.use(express.static(path.join(__dirname, '../public'))); // For serving static files like CSS, JS

app.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

app.get("/categories", (req, res) => {
  res.render("categories", { title: "Categories" });
});

router.get("/:page", (req, res) => {
  res.render("partials", { page: req.params.page }, (err, html) => {
    if (err) return res.status(404).send("<h2>Page Not Found</h2>");
    res.send(html);
  });
});

module.exports = router;
