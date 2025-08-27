const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User"); // 👈 YOU MISSED THIS LINE
const Experience = require("./models/Experience");
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500"], // ✅ Replace with your Netlify URL
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb+srv://user1:Aomxnbauaskldcm@cluster1.alcgag4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1", {
  // You can remove useNewUrlParser and useUnifiedTopology (they're deprecated)
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Register route
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

// Login route
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
app.get("/", (req, res) => {
  res.send("✅ HireStory Backend API is running.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

app.post("/api/experience", async (req, res) => {
  try {
    const {
      name,
      email,
      company,
      role,
      difficulty,
      experienceText,
      tags = [],
      resources = []
    } = req.body;

    const newExp = new Experience({
      name,
      email,
      company,
      role,
      difficulty,
      experienceText,
      tags,
      resources
    });

    await newExp.save();
    res.status(201).json({ message: "Experience shared successfully" });
  } catch (err) {
    console.error("❌ Error saving experience:", err);
    res.status(500).json({ message: "Failed to share experience" });
  }
});

// ✅ Get All Experiences Route (Unchanged)
app.get("/api/experience", async (req, res) => {
  try {
    const experiences = await Experience.find().sort({ date: -1 });
    res.json(experiences);
  } catch (err) {
    console.error("❌ Error loading experiences:", err);
    res.status(500).json({ message: "Failed to load experiences" });
  }
});
// GET: Get experience by ID
app.get("/api/experience/:id", async (req, res) => {
  try {
    const experience = await Experience.findById(req.params.id);
    if (!experience) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(experience);
  } catch (err) {
    console.error("Error fetching post by ID:", err);
    res.status(500).json({ message: "Failed to fetch post" });
  }
});
// Like a post
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

// Comment on a post
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

