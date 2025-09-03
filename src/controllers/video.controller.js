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

const getAllVideos = asyncHandler(async (req, res) => {
  // Extract query parameters with default values
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // Initialize empty pipeline array for MongoDB aggregation stages
  let pipeline = [];
  // STAGE 1: Filter by User ID (if provided)
  if (userId) {
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }
  // STAGE 2: Text Search (if query provided)
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { tags: { $in: [new RegExp(query, "i")] } },
        ],
      },
    });
  }

  // STAGE 3: Published Videos Filter
  pipeline.push({
    $match: { isPublished: true },
  });

  // STAGE 4: User Data Lookup
  pipeline.push(
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
    // STAGE 5: Convert Owner Array to Single Object
    {
      $addFields: {
        owner: { $first: "$owner" }, // Get first (and only) user from array
      },
    }
  );
  // STAGE 6: Sorting
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
  }
  // Calculate total number of matching videos for pagination
  const totalResults = await Video.countDocuments(
    pipeline.length > 0 ? pipeline[0].$match : {}
  );
  console.log(page);

  // STAGE 7: Pagination
  pipeline.push(
    {
      $skip: (Number(page) - 1) * Number(limit),
    },
    {
      $limit: Number(limit),
    }
  );

  // Execute the complete aggregation pipeline
  const videos = await Video.aggregate(pipeline);
  // Return paginated results with metadata
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        totalResults,
        currentPage: Number(page),
        totalPages: Math.ceil(totalResults / Number(limit)),
      },
      "Videos fetched successfully"
    )
  );
});

module.exports = {
  publishVideo,
  getAllVideos,
};