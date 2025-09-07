// backend/routes/savedPosts.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Experience = require("../models/Experience");

// Save a post
router.post("/saved-posts", async (req, res) => {
  try {
    const { userEmail, postId } = req.body;
    
    if (!userEmail || !postId) {
      return res.status(400).json({ message: "User email and post ID are required" });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if post exists
    const post = await Experience.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if post is already saved
    if (user.savedPosts.includes(postId)) {
      return res.status(400).json({ message: "Post already saved" });
    }

    // Add post to saved posts
    user.savedPosts.push(postId);
    await user.save();

    res.status(200).json({ message: "Post saved successfully" });
  } catch (err) {
    console.error("Error saving post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's saved posts
router.get("/saved-posts/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;

    const user = await User.findOne({ email: userEmail }).populate('savedPosts');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.savedPosts || []);
  } catch (err) {
    console.error("Error fetching saved posts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove a saved post
router.delete("/saved-posts", async (req, res) => {
  try {
    const { userEmail, postId } = req.body;
    
    if (!userEmail || !postId) {
      return res.status(400).json({ message: "User email and post ID are required" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove post from saved posts
    user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
    await user.save();

    res.json({ message: "Post removed from saved posts" });
  } catch (err) {
    console.error("Error removing saved post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;