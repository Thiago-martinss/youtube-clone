const mongoose = require("mongoose");
const User = require("../models/user.model");
const Video = require("../models/video.model");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  deleteFromCloudinary,
  uploadToCloudinary,
} = require("../utils/cloudinary");

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description, category, tags } = req.body;

  // Validate required fields
  if (!title || !description || !category) {
    throw new ApiError(400, "Title, description, and category are required");
  }

  // Check if files are uploaded
  if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  // Get file paths
  const videoLocalPath = req.files.videoFile[0]?.path;
  const thumbnailLocalPath = req.files.thumbnail[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  // Upload video to Cloudinary
  const videoUpload = await uploadToCloudinary(videoLocalPath, "videos");

  if (!videoUpload) {
    throw new ApiError(500, "Error uploading video");
  }

  // Upload thumbnail to Cloudinary
  const thumbnailUpload = await uploadToCloudinary(
    thumbnailLocalPath,
    "thumbnails"
  );

  if (!thumbnailUpload) {
    // Delete uploaded video if thumbnail upload fails
    await deleteFromCloudinary(videoUpload.public_id, "video");
    throw new ApiError(500, "Error uploading thumbnail");
  }

  // Create video document
  const video = await Video.create({
    title,
    description,
    videoFile: {
      public_id: videoUpload.public_id,
      url: videoUpload.secure_url,
    },
    thumbnail: {
      public_id: thumbnailUpload.public_id,
      url: thumbnailUpload.secure_url,
    },
    duration: videoUpload.duration || 0,
    owner: req.user._id,
    category,
    tags: tags ? JSON.parse(tags) : [],
  });

  // Return response
  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

module.exports = {
  publishVideo,
};