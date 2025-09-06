// backend/routes/userRoutes.js
const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// Get saved posts
router.get("/users/:id/saved-posts", authMiddleware, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id)
      return res.status(403).json({ message: "Not authorized" });

    const user = await User.findById(req.params.id).populate("savedPosts");
    res.json(user.savedPosts || []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Remove saved post
router.delete("/users/:id/saved-posts/:postId", authMiddleware, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id)
      return res.status(403).json({ message: "Not authorized" });

    const user = await User.findById(req.params.id);
    user.savedPosts = user.savedPosts.filter(
      (postId) => postId.toString() !== req.params.postId
    );
    await user.save();
    res.json({ message: "Post removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
