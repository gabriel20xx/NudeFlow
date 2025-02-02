const mongoose = require('mongoose');

const webpSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true } // Store duration in milliseconds
});

module.exports = mongoose.model('WebP', webpSchema);
