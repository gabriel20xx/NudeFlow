const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true } // Store duration in milliseconds
});

module.exports = mongoose.model('Video', videoSchema);
