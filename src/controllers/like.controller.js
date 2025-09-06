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

module.exports = {
  toggleLikeVideo,

};
