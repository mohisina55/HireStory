// models/Experience.js
const mongoose = require("mongoose");
const commentSchema = new mongoose.Schema({
  user: String,           // email or name of the user
  text: String,           // comment text
  date: { type: Date, default: Date.now }
});
const experienceSchema = new mongoose.Schema({
  name: String,
  email: String,
  company: String,
  role: String,
  difficulty: String,
  experienceText: String,
  tags: [String],
  resources: [String],
  likes: { type: Number, default: 0 },      // 👍 Likes
  comments: [commentSchema],   
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Experience", experienceSchema);
