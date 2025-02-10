const express = require('express');
const router = express.Router();

router.use(express.static("public")); // For serving static files like CSS, JS
router.get("/", (req, res) => res.render("home")); // Default route

router.get("/:page", (req, res) => {
  res.render("layout", { page: req.params.page }, (err, html) => {
    if (err) return res.status(404).send("<h2>Page Not Found</h2>");
    res.send(html);
  });
});

module.exports = router;
