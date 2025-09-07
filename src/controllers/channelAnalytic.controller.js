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

const updateChannelAnalytics = async (channelId) => {
  try {
    // Get total views, videos, likes and comments
    const videosAggregate = await Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
          totalVideos: { $sum: 1 },
        },
      },
    ]);
    //Get total comments
    const commentsCount = await Comment.countDocuments({
      video: { $in: await Video.find({ owner: channelId }).distinct("_id") },
    });

    //Get total likes
    const likesCount = await Like.countDocuments({
      video: { $in: await Video.find({ owner: channelId }).distinct("_id") },
    });

    //Get total subscribers
    const subscribersCount = await Subscription.countDocuments({
      channel: channelId,
    });
    //prepare the data
    const totalViews = videosAggregate[0]?.totalViews || 0;
    const totalVideos = videosAggregate[0]?.totalVideos || 0;
    // Get or create analytics document
    const analytics = await ChannelAnalytic.findOne({ channel: channelId });
    //Create today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get yesterday's analytics to calculate daily differences
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // Find yesterday's stats if they exist
    const yesterdayStats = analytics?.dailyStats?.find(
      (stat) => new Date(stat.date).toDateString() === yesterday.toDateString()
    );

    // Calculate subscribers gained/lost today
    const previousSubscribers = yesterdayStats
      ? analytics.totalSubscribers || 0
      : subscribersCount;

    const subscribersGained = Math.max(
      0,
      subscribersCount - previousSubscribers
    );
    const subscribersLost = Math.max(0, previousSubscribers - subscribersCount);

    //Create or update analytics
    if (!analytics) {
      //Create new analytics count
      analytics = await ChannelAnalytic.create({
        channel: channelId,
        totalViews,
        totalSubscribers: subscribersCount,
        totalVideos,
        totalLikes: likesCount,
        totalComments: commentsCount,
        dailyStats: [
          {
            date: today,
            views: totalViews,
            subscribersGained,
            likes: likesCount,
            comments: commentsCount,
          },
        ],
      });
    } else {
      // Check if today's stats already exist
      const todayStatsIndex = analytics.dailyStats.findIndex(
        (stat) => new Date(stat.date).toDateString() === today.toDateString()
      );
      if (todayStatsIndex !== -1) {
        // Update today's stats
        analytics.dailyStats[todayStatsIndex] = {
          date: today,
          views: totalViews - (yesterdayStats?.views || 0),
          subscribersGained,
          subscribersLost,
          likes: likesCount - (yesterdayStats?.likes || 0),
          comments: commentsCount - (yesterdayStats?.comments || 0),
        };
      } else {
        // Add today's stats
        analytics.dailyStats.push({
          date: today,
          views: totalViews - (yesterdayStats?.views || 0),
          subscribersGained,
          subscribersLost,
          likes: likesCount - (yesterdayStats?.likes || 0),
          comments: commentsCount - (yesterdayStats?.comments || 0),
        });
      }
      //Update the totals
      analytics.totalViews = totalViews;
      analytics.totalSubscribers = subscribersCount;
      analytics.totalVideos = totalVideos;
      analytics.totalLikes = likesCount;
      analytics.totalComments = commentsCount;

      //Resave
      await analytics.save();
    }
    return analytics;
  } catch (error) {
    console.log("Error updating channel analytics", error);
    return null;
  }
};

module.exports = {
  getChannelAnalyticsOverview,
  getChannelDetailedAnalytics,
  updateChannelAnalytics,
 
};
