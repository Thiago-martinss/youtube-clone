const mongoose = require("mongoose");
const Like = require("../models/like.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Video = require("../models/video.model");


const toggleLikeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video Id is required");
  }
  //Check if already liked
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });
  let message;
  if (existingLike) {
    //Unlike
    await Like.findByIdAndDelete(existingLike._id);
    message = "Video unliked successfully ";
    //Update video likes count
    await Video.findByIdAndUpdate(videoId, { $inc: { likes: -1 } });
  } else {
    //Like video
    //Update video likes count
    await Video.findByIdAndUpdate(videoId, { $inc: { likes: 1 } });
    await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });
    message = "Video liked successfully";
  }
  return res.status(200).json(new ApiResponse(200, {}, message));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, "Comment Id is required");
  }
  //Check if already liked
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });
  let message;
  if (existingLike) {
    //Unlike
    await Like.findByIdAndDelete(existingLike._id);
    message = "Comment unliked successfully ";
  } else {
    //Like comment
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
    message = "Comment liked successfully";
  }
  return res.status(200).json(new ApiResponse(200, {}, message));
});
//@Desc:  Get all Liked videos liked by the authenticated user
//@route   GET /api/v1/video/:videoId
//@access  Private
const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
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
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: { $first: "$video" },
      },
    },
    {
      $project: {
        _id: 0,
        video: 1,
        likedAt: "$createdAt",
      },
    },
  ]);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likedVideos,
        totalLikedVideos: likedVideos.length,
      },
      "Liked videos fetched successfully"
    )
  );
});

module.exports = {
  toggleLikeVideo,
  toggleCommentLike,
  getLikedVideos,

};
