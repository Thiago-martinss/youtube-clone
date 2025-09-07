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

const getChannelDetailedAnalytics = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { startDate, endDate } = req.query;

  // Validate channel
  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  // Check if channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Check if user is authorized to view analytics
  if (channelId.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You don't have permission to view these analytics"
    );
  }

  // Parse dates
  const startDateTime = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
  const endDateTime = endDate ? new Date(endDate) : new Date();

  // Validate dates
  if (startDateTime > endDateTime) {
    throw new ApiError(400, "Start date cannot be after end date");
  }

  // Get analytics for the specified time period
  const analytics = await ChannelAnalytic.findOne({ channel: channelId });

  if (!analytics) {
    throw new ApiError(404, "Analytics not found for this channel");
  }

  // Filter daily stats by date range
  const filteredDailyStats = analytics.dailyStats.filter((stat) => {
    const statDate = new Date(stat.date);
    return statDate >= startDateTime && statDate <= endDateTime;
  });

  // Calculate totals for the period
  const periodTotals = filteredDailyStats.reduce(
    (acc, stat) => {
      acc.views += stat.views;
      acc.subscribersGained += stat.subscribersGained;
      acc.subscribersLost += stat.subscribersLost;
      acc.likes += stat.likes;
      acc.comments += stat.comments;
      return acc;
    },
    {
      views: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      likes: 0,
      comments: 0,
    }
  );

  // Get most popular videos
  const popularVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
        createdAt: { $gte: startDateTime, $lte: endDateTime },
      },
    },
    {
      $sort: { views: -1 },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        _id: 1,
        title: 1,
        thumbnail: 1,
        views: 1,
        createdAt: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        channelTotals: {
          totalViews: analytics.totalViews,
          totalSubscribers: analytics.totalSubscribers,
          totalVideos: analytics.totalVideos,
          totalLikes: analytics.totalLikes,
          totalComments: analytics.totalComments,
        },
        periodTotals,
        dailyStats: filteredDailyStats,
        popularVideos,
        dateRange: {
          startDate: startDateTime,
          endDate: endDateTime,
        },
      },
      "Detailed channel analytics fetched successfully"
    )
  );
});

module.exports = {
  getChannelAnalyticsOverview,
  getChannelDetailedAnalytics,
 
};
