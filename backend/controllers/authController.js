const crypto = require("crypto");
const User = require("../models/User");
const sendResetEmail = require("../mailer");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    await sendResetEmail(email, token);

    res.status(200).json({ message: "Password reset email sent!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error sending reset email." });
  }
};
