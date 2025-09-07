// SERVER.JS SETUP GUIDE
// Replace your existing server.js with this complete version

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Import Models
const User = require("./models/User");
const Experience = require("./models/Experience");
const UserActivity = require("./models/UserActivity"); // ADD THIS IMPORT

const app = express();
const PORT = process.env.PORT || 5000;

// ================== Middleware ==================
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
  credentials: true
}));
app.use(express.json());

// ================== MongoDB Connection ==================
mongoose.connect("mongodb+srv://user1:Aomxnbauaskldcm@cluster1.alcgag4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ================== Helper Functions ==================

// Helper function to safely track activity
async function trackUserActivity(userEmail, type, postId, postDetails, metadata = {}) {
  try {
    if (!userEmail || !UserActivity) return;
    
    const user = await User.findOne({ email: userEmail });
    if (!user) return;

    const activity = new UserActivity({
      userId: user._id,
      userEmail: userEmail,
      type: type,
      postId: postId,
      postDetails: postDetails,
      metadata: metadata,
      timestamp: new Date()
    });

    await activity.save();
    console.log(`✅ Activity tracked: ${type} by ${userEmail}`);
  } catch (err) {
    console.warn(`⚠️ Activity tracking failed for ${type}:`, err.message);
    // Don't throw error - let the main operation continue
  }
}

// ================== AUTH ROUTES ==================

// REGISTER
app.post("/api/register", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, role });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, "secret_key", { expiresIn: "1h" });
    res.json({ message: "Login successful", user, token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// FORGOT PASSWORD
app.post("/api/ForgotPassword", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `http://localhost:5500/reset-password.html?token=${resetToken}`;

    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset.</p>
             <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
             <p>This link will expire in 1 hour.</p>`
    });

    res.status(200).json({ message: "Password reset link sent to your email." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// RESET PASSWORD
app.post("/api/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== EXPERIENCE ROUTES ==================

// CREATE: Post new experience
app.post("/api/experience", async (req, res) => {
  try {
    const { name, email, company, role, difficulty, experienceText, tags = [], resources = [] } = req.body;
    const newExp = new Experience({ name, email, company, role, difficulty, experienceText, tags, resources });
    await newExp.save();

    // Track the post activity
    if (email) {
      await trackUserActivity(email, 'post', newExp._id, {
        company: company,
        role: role,
        difficulty: difficulty,
        title: `${role} @ ${company}`
      });
    }

    res.status(201).json({ message: "Experience shared successfully", postId: newExp._id });
  } catch (err) {
    console.error("❌ Error saving experience:", err);
    res.status(500).json({ message: "Failed to share experience" });
  }
});

// READ: Get all experiences
app.get("/api/experience", async (req, res) => {
  try {
    const experiences = await Experience.find().sort({ date: -1 });
    res.json(experiences);
  } catch (err) {
    console.error("❌ Error loading experiences:", err);
    res.status(500).json({ message: "Failed to load experiences" });
  }
});

// READ: Get experience by ID
app.get("/api/experience/:id", async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);
    if (!experience) return res.status(404).json({ message: "Post not found" });

    // Track view activity if user email is provided in query params
    const userEmail = req.query.userEmail;
    if (userEmail) {
      await trackUserActivity(userEmail, 'view', experience._id, {
        company: experience.company,
        role: experience.role,
        difficulty: experience.difficulty,
        title: `${experience.role} @ ${experience.company}`
      });
    }

    res.json(experience);
  } catch (err) {
    console.error("Error fetching post by ID:", err);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

// UPDATE: Like a post
app.post("/api/experience/:id/like", async (req, res) => {
  try {
    const { userEmail } = req.body;
    
    console.log(`📝 Like request received for post ${req.params.id} by user ${userEmail}`);
    
    // Validate post exists
    const post = await Experience.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is provided
    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    // Increment likes
    post.likes = (post.likes || 0) + 1;
    await post.save();

    // Track like activity
    await trackUserActivity(userEmail, 'like', post._id, {
      company: post.company,
      role: post.role,
      difficulty: post.difficulty,
      title: `${post.role} @ ${post.company}`
    });

    console.log(`✅ Post liked by ${userEmail}. Total likes: ${post.likes}`);
    res.json({ 
      likes: post.likes,
      message: "Post liked successfully" 
    });

  } catch (err) {
    console.error("❌ Error liking post:", err);
    res.status(500).json({ 
      message: "Failed to like post",
      error: err.message 
    });
  }
});

// UPDATE: Comment on a post
app.post("/api/experience/:id/comment", async (req, res) => {
  try {
    const { user, text } = req.body;
    
    console.log(`📝 Comment request received for post ${req.params.id} by user ${user}`);
    
    // Validate input
    if (!user || !text) {
      return res.status(400).json({ message: "User and comment text are required" });
    }

    // Validate post exists
    const post = await Experience.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Add comment
    const newComment = {
      user: user,
      text: text,
      date: new Date()
    };
    
    post.comments.push(newComment);
    await post.save();

    // Track comment activity
    await trackUserActivity(user, 'comment', post._id, {
      company: post.company,
      role: post.role,
      difficulty: post.difficulty,
      title: `${post.role} @ ${post.company}`
    }, {
      comment: text.substring(0, 200)
    });

    console.log(`✅ Comment added by ${user}. Total comments: ${post.comments.length}`);
    res.json({ 
      comments: post.comments,
      message: "Comment added successfully"
    });

  } catch (err) {
    console.error("❌ Error adding comment:", err);
    res.status(500).json({ 
      message: "Failed to add comment",
      error: err.message 
    });
  }
});

// UPDATE: Update experience by ID
app.put("/api/experience/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const { name, email, company, role, difficulty, experienceText, tags = [], resources = [] } = req.body;
    
    const updatedPost = await Experience.findByIdAndUpdate(
      postId,
      { name, email, company, role, difficulty, experienceText, tags, resources },
      { new: true }
    );
    
    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    res.json({ message: "Post updated successfully", post: updatedPost });
  } catch (err) {
    console.error("❌ Error updating post:", err);
    res.status(500).json({ message: "Failed to update post" });
  }
});

// DELETE: Delete experience by ID
app.delete("/api/experience/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    
    const deletedPost = await Experience.findByIdAndDelete(postId);
    
    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting post:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

// ================== SAVED POSTS ROUTES ==================

// Save a post
app.post("/api/saved-posts", async (req, res) => {
  try {
    const { userEmail, postId } = req.body;
    
    if (!userEmail || !postId) {
      return res.status(400).json({ message: "User email and post ID are required" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Experience.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    if (user.savedPosts.includes(postId)) {
      return res.status(400).json({ message: "Post already saved" });
    }

    user.savedPosts.push(postId);
    await user.save();

    // Track save activity
    await trackUserActivity(userEmail, 'save', postId, {
      company: post.company,
      role: post.role,
      difficulty: post.difficulty,
      title: `${post.role} @ ${post.company}`
    });

    res.status(200).json({ message: "Post saved successfully" });
  } catch (err) {
    console.error("Error saving post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's saved posts
app.get("/api/saved-posts/:userEmail", async (req, res) => {
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
app.delete("/api/saved-posts", async (req, res) => {
  try {
    const { userEmail, postId } = req.body;
    
    if (!userEmail || !postId) {
      return res.status(400).json({ message: "User email and post ID are required" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
    await user.save();

    res.json({ message: "Post removed from saved posts" });
  } catch (err) {
    console.error("Error removing saved post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== ACTIVITY ROUTES ==================

// Get user by email
app.get("/api/user/by-email/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email: email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      _id: user._id,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    console.error("Error finding user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user activity summary
app.get("/api/activity/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!UserActivity) {
      return res.json({
        likesGiven: 0,
        comments: 0,
        postsShared: 0,
        postsSaved: 0,
        postsViewed: 0,
        totalActivities: 0,
        engagementScore: 0
      });
    }

    const activities = await UserActivity.find({ userId: userId });
    
    const summary = {
      likesGiven: activities.filter(a => a.type === 'like').length,
      comments: activities.filter(a => a.type === 'comment').length,
      postsShared: activities.filter(a => a.type === 'post').length,
      postsSaved: activities.filter(a => a.type === 'save').length,
      postsViewed: activities.filter(a => a.type === 'view').length,
      totalActivities: activities.length,
      engagementScore: 0
    };

    summary.engagementScore = (
      (summary.postsShared * 10) +
      (summary.comments * 5) +
      (summary.likesGiven * 2) +
      (summary.postsSaved * 3) +
      (summary.postsViewed * 1)
    );

    res.json(summary);
  } catch (err) {
    console.error("Error getting activity summary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user activity timeline
app.get("/api/activity/timeline/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days) || 30;

    if (!UserActivity) {
      return res.json([]);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const timeline = await UserActivity.find({
      userId: userId,
      timestamp: { $gte: startDate }
    }).populate('postId', 'company role difficulty experienceText')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(timeline);
  } catch (err) {
    console.error("Error getting activity timeline:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user activity stats
app.get("/api/activity/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!UserActivity) {
      return res.json({
        dailyStats: [],
        topInterests: [],
        typeBreakdown: []
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const objectId = new mongoose.Types.ObjectId(userId);

    const dailyStats = await UserActivity.aggregate([
      { 
        $match: { 
          userId: objectId, 
          timestamp: { $gte: thirtyDaysAgo } 
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topInterests = await UserActivity.aggregate([
      { $match: { userId: objectId } },
      { $match: { "postDetails.company": { $exists: true } } },
      {
        $group: {
          _id: {
            company: "$postDetails.company",
            role: "$postDetails.role"
          },
          count: { $sum: 1 },
          lastInteraction: { $max: "$timestamp" }
        }
      },
      { $sort: { count: -1, lastInteraction: -1 } },
      { $limit: 10 }
    ]);

    const typeBreakdown = await UserActivity.aggregate([
      { $match: { userId: objectId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      dailyStats,
      topInterests,
      typeBreakdown
    });
  } catch (err) {
    console.error("Error getting activity stats:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user activity streak
app.get("/api/activity/streak/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!UserActivity) {
      return res.json({ streak: 0, activeDates: 0 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const objectId = new mongoose.Types.ObjectId(userId);

    const dailyActivity = await UserActivity.aggregate([
      { 
        $match: { 
          userId: objectId,
          timestamp: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    let streak = 0;
    const activeDates = dailyActivity.map(d => d._id);
    let currentDate = new Date();

    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (activeDates.includes(dateStr)) {
        streak++;
      } else {
        break;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }

    res.json({ streak, activeDates: activeDates.length });
  } catch (err) {
    console.error("Error getting activity streak:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ROOT
app.get("/", (req, res) => {
  res.send("✅ HireStory Backend API is running with Activity Tracking.");
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("📊 Activity tracking enabled");
});