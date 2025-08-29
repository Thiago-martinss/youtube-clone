const User = require("../models/user.model");
const Video = require("../models/video.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  deleteFromCloudinary,
  uploadToCloudinary,
} = require("../utils/cloudinary");

const getChannelInfo = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "Username is required");
  }
  //Get the channel
  const channel = await User.findOne({ username }).select(
    "-password -refreshToken -watchHistory -notificationSettings -email -isVerified"
  );
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, channel, "Channel fetched successfully"));
});

module.exports = {
  getChannelInfo,
};