// backend/models/UserActivity.js
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'post', 'save', 'view'],
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experience',
    required: true
  },
  postDetails: {
    company: String,
    role: String,
    difficulty: String,
    title: String
  },
  metadata: {
    comment: String,  // for comment activities
    viewDuration: Number,  // for view activities (in seconds)
    source: String  // where the activity came from
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
activitySchema.index({ userId: 1, timestamp: -1 });
activitySchema.index({ userEmail: 1, type: 1 });
activitySchema.index({ postId: 1 });

// Static method to get user activity summary
activitySchema.statics.getUserSummary = async function(userId) {
  const summary = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        lastActivity: { $max: "$timestamp" },
        companies: { $addToSet: "$postDetails.company" },
        roles: { $addToSet: "$postDetails.role" }
      }
    }
  ]);
  
  return summary;
};

// Static method to get activity timeline
activitySchema.statics.getTimeline = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    userId: userId,
    timestamp: { $gte: startDate }
  }).populate('postId', 'company role difficulty experienceText')
    .sort({ timestamp: -1 })
    .limit(50);
};

// Static method to get engagement stats
activitySchema.statics.getEngagementStats = async function(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), timestamp: { $gte: thirtyDaysAgo } } },
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
  
  return stats;
};

// Static method to get top interests
activitySchema.statics.getTopInterests = async function(userId) {
  const interests = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
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
  
  return interests;
};

module.exports = mongoose.model("UserActivity", activitySchema);