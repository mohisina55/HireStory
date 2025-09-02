require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("./models/user");
const Experience = require("./models/Experience");

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

// ================== Routes ==================

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
    res.status(201).json({ message: "Experience shared successfully" });
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
    res.json(experience);
  } catch (err) {
    console.error("Error fetching post by ID:", err);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});

// UPDATE: Like a post
app.post("/api/experience/:id/like", async (req, res) => {
  try {
    const post = await Experience.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.likes = (post.likes || 0) + 1;
    await post.save();
    res.json({ likes: post.likes });
  } catch (err) {
    console.error("❌ Error liking post:", err);
    res.status(500).json({ message: "Failed to like post" });
  }
});

// UPDATE: Comment on a post
app.post("/api/experience/:id/comment", async (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) return res.status(400).json({ message: "Invalid comment data" });
  try {
    const post = await Experience.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.comments.push({ user, text });
    await post.save();
    res.json({ comments: post.comments });
  } catch (err) {
    console.error("❌ Error commenting post:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

// UPDATE: Update experience by ID
app.put("/api/experience/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const { name, email, company, role, difficulty, experienceText, tags = [], resources = [] } = req.body;
    
    // Find and update the experience
    const updatedPost = await Experience.findByIdAndUpdate(
      postId,
      { name, email, company, role, difficulty, experienceText, tags, resources },
      { new: true } // Return the updated document
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
    
    // Find and delete the experience
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

// ROOT
app.get("/", (req, res) => {
  res.send("✅ HireStory Backend API is running.");
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});