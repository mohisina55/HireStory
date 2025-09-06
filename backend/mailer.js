const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,  // Gmail address
    pass: process.env.EMAIL_PASS   // Gmail App Password
  }
});

const sendResetEmail = async (email, token) => {
  const resetLink = `http://localhost:5500/reset-password.html?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Password Reset Request",
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click the link below:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset email sent to ${email}`);
  } catch (err) {
    console.error("❌ Error sending email:", err);
    throw err;
  }
};

module.exports = sendResetEmail;
