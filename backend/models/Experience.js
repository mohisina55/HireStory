// models/Experience.js
const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema({
  name: String,
  email: String,
  company: String,
  role: String,
  difficulty: String,
  experienceText: String,
  tags: [String],
  resources: [String],
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Experience", experienceSchema);
