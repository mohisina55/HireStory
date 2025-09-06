// backend/models/User.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["Student", "Professional", "Recruiter"],
    required: true,
  },
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experience'
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});
const User = mongoose.model("User", userSchema);
module.exports = User;
