const mongoose = require("mongoose");
const ChannelAnalytic = require("../models/channelAnalytics.model");
const Like = require("../models/like.model");
const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");
const Video = require("../models/video.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Comment = require("../models/comment.model");

const getChannelAnalyticsOverview = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId || req.user._id;
  //Check if channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }
  //Check if user is authorized to view analytics
  if (channelId.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You don't have permission to view these analytics"
    );
  }
  // Get or create channel analytics
  let analytics = await ChannelAnalytic.findOne({ channel: channelId });
  if (!analytics) {
    // If no analytics record exists, create one
    analytics = await updateChannelAnalytics(channelId);
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, analytics, "Channel analytics fetched successfully")
    );
});

module.exports = {
  getChannelAnalyticsOverview,
 
};
