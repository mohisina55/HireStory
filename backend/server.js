require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("./models/User");
const Experience = require("./models/Experience");
const UserActivity = require("./models/UserActivity");

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

// ================== Auth Routes ==================

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

// ================== SAVED POSTS ROUTES ==================

// Save a post (with activity tracking)
app.post("/api/saved-posts", async (req, res) => {
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
    if (user.savedPosts && user.savedPosts.includes(postId)) {
      return res.status(400).json({ message: "Post already saved" });
    }

    // Initialize savedPosts array if it doesn't exist
    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    // Add post to saved posts
    user.savedPosts.push(postId);
    await user.save();

    // Track save activity
    const activity = new UserActivity({
      userId: user._id,
      userEmail: userEmail,
      type: 'save',
      postId: postId,
      postDetails: {
        company: post.company,
        role: post.role,
        difficulty: post.difficulty,
        title: `${post.role} @ ${post.company}`
      },
      timestamp: new Date()
    });
    await activity.save().catch(err => console.error("Error tracking save activity:", err));

    res.status(200).json({ message: "Post saved successfully" });
  } catch (err) {
    console.error("Error saving post:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's saved posts (unchanged)
app.get("/api/saved-posts/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;

    const user = await User.findOne({ email: userEmail }).populate('savedPosts');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return saved posts or empty array if none exist
    res.json(user.savedPosts || []);
  } catch (err) {
    console.error("Error fetching saved posts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove a saved post (no activity tracking needed for unsave)
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

    // Initialize savedPosts array if it doesn't exist
    if (!user.savedPosts) {
      user.savedPosts = [];
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

// ================== EXPERIENCE ROUTES ==================

// ================== EXPERIENCE ROUTES WITH ACTIVITY TRACKING ==================

// CREATE: Post new experience (with activity tracking)
app.post("/api/experience", async (req, res) => {
  try {
    const { name, email, company, role, difficulty, experienceText, tags = [], resources = [] } = req.body;
    const newExp = new Experience({ name, email, company, role, difficulty, experienceText, tags, resources });
    await newExp.save();

    // Track the post activity
    if (email) {
      const user = await User.findOne({ email: email });
      if (user) {
        const activity = new UserActivity({
          userId: user._id,
          userEmail: email,
          type: 'post',
          postId: newExp._id,
          postDetails: {
            company: company,
            role: role,
            difficulty: difficulty,
            title: `${role} @ ${company}`
          },
          timestamp: new Date()
        });
        await activity.save().catch(err => console.error("Error tracking post activity:", err));
      }
    }

    res.status(201).json({ message: "Experience shared successfully" });
  } catch (err) {
    console.error("❌ Error saving experience:", err);
    res.status(500).json({ message: "Failed to share experience" });
  }
});

// READ: Get all experiences (unchanged)
app.get("/api/experience", async (req, res) => {
  try {
    const experiences = await Experience.find().sort({ date: -1 });
    res.json(experiences);
  } catch (err) {
    console.error("❌ Error loading experiences:", err);
    res.status(500).json({ message: "Failed to load experiences" });
  }
});

// READ: Get experience by ID (with view tracking)
app.get("/api/experience/:id", async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);
    if (!experience) return res.status(404).json({ message: "Post not found" });

    // Track view activity if user email is provided in query params
    const userEmail = req.query.userEmail;
    if (userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (user) {
        const activity = new UserActivity({
          userId: user._id,
          userEmail: userEmail,
          type: 'view',
          postId: experience._id,
          postDetails: {
            company: experience.company,
            role: experience.role,
            difficulty: experience.difficulty,
            title: `${experience.role} @ ${experience.company}`
          },
          metadata: {
            viewDuration: req.query.duration || null
          },
          timestamp: new Date()
        });
        await activity.save().catch(err => console.error("Error tracking view activity:", err));
      }
    }

    res.json(experience);
  } catch (err) {
    console.error("Error fetching post by ID:", err);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

// UPDATE: Like a post (with activity tracking)
app.post("/api/experience/:id/like", async (req, res) => {
  try {
    const { userEmail } = req.body; // Get user email from request body
    
    const post = await Experience.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    
    post.likes = (post.likes || 0) + 1;
    await post.save();

    // Try to track like activity (but don't fail if it doesn't work)
    if (userEmail) {
      try {
        const user = await User.findOne({ email: userEmail });
        if (user && UserActivity) {
          const activity = new UserActivity({
            userId: user._id,
            userEmail: userEmail,
            type: 'like',
            postId: post._id,
            postDetails: {
              company: post.company,
              role: post.role,
              difficulty: post.difficulty,
              title: `${post.role} @ ${post.company}`
            },
            timestamp: new Date()
          });
          await activity.save();
        }
      } catch (activityErr) {
        console.warn("Activity tracking failed for like:", activityErr);
        // Don't fail the like operation if activity tracking fails
      }
    }

    res.json({ likes: post.likes });
  } catch (err) {
    console.error("❌ Error liking post:", err);
    res.status(500).json({ message: "Failed to like post" });
  }
});

// UPDATE: Comment on a post (with activity tracking)
app.post("/api/experience/:id/comment", async (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) return res.status(400).json({ message: "Invalid comment data" });
  
  try {
    const post = await Experience.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    
    post.comments.push({ user, text });
    await post.save();

    // Try to track comment activity (but don't fail if it doesn't work)
    try {
      const userDoc = await User.findOne({ email: user });
      if (userDoc && UserActivity) {
        const activity = new UserActivity({
          userId: userDoc._id,
          userEmail: user,
          type: 'comment',
          postId: post._id,
          postDetails: {
            company: post.company,
            role: post.role,
            difficulty: post.difficulty,
            title: `${post.role} @ ${post.company}`
          },
          metadata: {
            comment: text.substring(0, 200) // Store first 200 chars of comment
          },
          timestamp: new Date()
        });
        await activity.save();
      }
    } catch (activityErr) {
      console.warn("Activity tracking failed for comment:", activityErr);
      // Don't fail the comment operation if activity tracking fails
    }

    res.json({ comments: post.comments });
  } catch (err) {
    console.error("❌ Error commenting post:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

// UPDATE: Update experience by ID (unchanged)
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

// DELETE: Delete experience by ID (unchanged)
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
// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
// Add these routes to your server.js file (after the saved posts routes)

// ================== ACTIVITY TRACKING ROUTES ==================

// Track user activity (called when user performs an action)
app.post("/api/activity/track", async (req, res) => {
  try {
    const { userEmail, type, postId, metadata = {} } = req.body;
    
    if (!userEmail || !type || !postId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get post details
    const post = await Experience.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create activity record
    const activity = new UserActivity({
      userId: user._id,
      userEmail: userEmail,
      type: type,
      postId: postId,
      postDetails: {
        company: post.company,
        role: post.role,
        difficulty: post.difficulty,
        title: `${post.role} @ ${post.company}`
      },
      metadata: metadata,
      timestamp: new Date()
    });

    await activity.save();
    res.status(201).json({ message: "Activity tracked successfully" });
  } catch (err) {
    console.error("Error tracking activity:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user activity summary
app.get("/api/activity/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all user activities
    const activities = await UserActivity.find({ userId: userId });
    
    // Count different types of activities
    const summary = {
      likesGiven: activities.filter(a => a.type === 'like').length,
      comments: activities.filter(a => a.type === 'comment').length,
      postsShared: activities.filter(a => a.type === 'post').length,
      postsSaved: activities.filter(a => a.type === 'save').length,
      postsViewed: activities.filter(a => a.type === 'view').length,
      totalActivities: activities.length,
      engagementScore: 0
    };

    // Calculate engagement score (weighted scoring)
    summary.engagementScore = (
      (summary.postsShared * 10) +     // Sharing is most valuable
      (summary.comments * 5) +         // Comments show engagement
      (summary.likesGiven * 2) +       // Likes show appreciation
      (summary.postsSaved * 3) +       // Saves show value recognition
      (summary.postsViewed * 1)        // Views show interest
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

// Get user activity stats (for charts)
app.get("/api/activity/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Daily activity stats for charts
    const dailyStats = await UserActivity.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId), 
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
          count: { $sum: 1 },
          types: { $push: "$type" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top interests (companies and roles user interacts with most)
    const topInterests = await UserActivity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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

    // Activity type breakdown
    const typeBreakdown = await UserActivity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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
    
    // Get activities from last 30 days, grouped by date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivity = await UserActivity.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
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

    // Calculate streak
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = new Date();

    // Check if user was active today or yesterday (to account for timezone)
    const activeDates = dailyActivity.map(d => d._id);
    
    for (let i = 0; i < 30; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (activeDates.includes(dateStr)) {
        streak++;
      } else {
        break; // Streak broken
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }

    res.json({ streak, activeDates: activeDates.length });
  } catch (err) {
    console.error("Error getting activity streak:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get leaderboard (optional - for community features)
app.get("/api/activity/leaderboard", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaderboard = await UserActivity.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: "$userId",
          userEmail: { $first: "$userEmail" },
          totalActivities: { $sum: 1 },
          likes: { $sum: { $cond: [{ $eq: ["$type", "like"] }, 1, 0] } },
          comments: { $sum: { $cond: [{ $eq: ["$type", "comment"] }, 1, 0] } },
          posts: { $sum: { $cond: [{ $eq: ["$type", "post"] }, 1, 0] } },
          saves: { $sum: { $cond: [{ $eq: ["$type", "save"] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ["$posts", 10] },
              { $multiply: ["$comments", 5] },
              { $multiply: ["$saves", 3] },
              { $multiply: ["$likes", 2] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } },
      { $limit: 10 }
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error("Error getting leaderboard:", err);
    res.status(500).json({ message: "Server error" });
  }
});