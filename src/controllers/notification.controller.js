
const mongoose = require("mongoose");
const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");


const getUserNotifications = asyncHandler(async (req, res) => {
  // Extract query parameters with default values
  const { page = 1, limit = 10, unreadOnly = false } = req.query;

  // Build the base match stage for MongoDB aggregation
  const matchStage = {
    recipient: new mongoose.Types.ObjectId(req.user._id),
  };
  // Add read status filter if unreadOnly is true
  if (unreadOnly === "true") {
    matchStage.read = false;
  }
  // Execute aggregation pipeline to get notifications
  const notifications = await Notification.aggregate([
    // Stage 1: Filter notifications by recipient and read status
    {
      $match: matchStage,
    },
    // Stage 2: Join with users collection to get sender details
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
        pipeline: [
          // Select specific fields from sender
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    // Stage 3: Convert sender array to single object
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
    // Stage 4: Sort notifications by creation date
    {
      $sort: { createdAt: -1 },
    },
    // Stage 5: Skip previous pages for pagination
    {
      $skip: (Number(page) - 1) * Number(limit),
    },
    // Stage 6: Limit results per page
    {
      $limit: Number(limit),
    },
  ]);
  // Get count of unread notifications for badge/counter
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    read: false,
  });

  // Get total count of all notifications for pagination
  const totalCount = await Notification.countDocuments({
    recipient: req.user._id,
  });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        unreadCount,
        totalCount,
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
      "Notifications fetched successfully"
    )
  );
});


module.exports = {
  getUserNotifications,

};
