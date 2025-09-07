const mongoose = require("mongoose");
const Like = require("../models/like.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Video = require("../models/video.model");
const Comment = require("../models/comment.model");
const { createNotification } = require("./notification.controller");


const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
        parentComment: null,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
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
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "parentComment",
        as: "replies",
        pipeline: [
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
    {
      $addFields: {
        owner: { $first: "$owner" },
        repliesCount: { $size: "$replies" },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);
  // Get total comments count
  const totalComments = await Comment.countDocuments({
    video: videoId,
    parentComment: null,
  });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        totalComments,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / parseInt(limit)),
      },
      "Comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content, parentCommentId } = req.body;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  if (!content || content.trim() == "") {
    throw new ApiError(400, "Comment content is required");
  }
  //Create comment object
  const commentData = {
    content,
    video: videoId,
    owner: req.user._id,
  };
  // Add parent comment reference if provided
  if (parentCommentId) {
    // Check if parent comment exists
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      throw new ApiError(404, "parent comment not found");
    }
    commentData.parentComment = parentCommentId;
  }

  //Create comment
  const comment = await Comment.create(commentData);
  //Get populated comment
  const populatedComment = await Comment.findById(comment._id).populate(
    "owner",
    "username fullName avatar"
  );
  //Send notifications
  if (parentCommentId) {
    // Reply notification - notify the comment owner
    const parentComment = await Comment.findById(parentCommentId);
    if (
      parentComment &&
      parentComment.owner.toString() !== req.user._id.toString()
    ) {
      await createNotification(
        parentComment.owner,
        req.user._id,
        "REPLY",
        `${req.user.fullName} replied to your comment`
      );
    }
  } else {
    // New comment notification - notify the video owner
    const video = await Video.findById(videoId);
    if (video && video.owner.toString() !== req.user._id.toString()) {
      await createNotification(
        video.owner,
        req.user._id,
        "COMMENT",
        `${req.user.fullName} commented on your video`
      );
    }
  }
  return res
    .status(201)
    .json(new ApiResponse(201, populatedComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  if (!commentId) {
    throw new ApiError(400, "Comment Id is required");
  }
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content is required");
  }
  // Check if comment exists and belongs to user
  const comment = await Comment.findOne({
    _id: commentId,
    owner: req.user._id,
  });
  if (!comment) {
    throw new ApiError(404, "Comment not found or you don't have permission");
  }
  //Update the comment
  comment.content = content;
  await comment.save();
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Comment Id is required");
  }
  // Check if comment exists and belongs to user
  const comment = await Comment.findOne({
    _id: commentId,
    owner: req.user._id,
  });
  if (!comment) {
    throw new ApiError(404, "Comment not found or you don't have permission");
  }
  // Delete comment and all replies
  await Promise.all([
    Comment.deleteMany({ parentComment: commentId }),
    Comment.findByIdAndDelete(commentId),
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

module.exports = {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
};
