const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Atlas connection
mongoose.connect("mongodb+srv://hirestory:hirestory123@cluster0.xxxxx.mongodb.net/hirestory?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Atlas Error:", err));


// Routes
app.use("/api", authRoutes);

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
