const mongoose = require("mongoose");
const User = require("../models/user.model");
const Video = require("../models/video.model");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const {
  deleteFromCloudinary,
  uploadToCloudinary,
} = require("../utils/cloudinary");
const ApiError = require('../utils/apiError');


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

const getVideoById = asyncHandler(async (req, res) => {
  console.log(req.query);

  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video Id is required");
  }
  //Find the video and update views
  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: { views: 1 },
    },
    { new: true }
  ).populate("owner", "username fullName avatar");
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  //Add to user's watch history
  if (req.user) {
    console.log(req.user);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { watchHistory: videoId },
      },
      { new: true }
    );
    console.log(user);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, category, tags, isPublished } = req.body;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  //Check if video exists and belongs to user
  const video = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });
  if (!video) {
    throw new ApiError(400, "Video not found or you don't have permission");
  }
  //Update thumbnail if uploaded
  let thumbnailUpdate = {};
  if (req.file) {
    const thumbnailLocalPath = req.file.path;
    if (thumbnailLocalPath) {
      //Delete the old thumbnail
      if (video?.thumbnail?.public_id) {
        await deleteFromCloudinary(video?.thumbnail?.public_id);
      }
      //Upload new thumbnail
      const thumbnailUpload = await uploadToCloudinary(
        thumbnailLocalPath,
        "youtube/thumbnails"
      );
      if (!thumbnailUpload) {
        throw new ApiError(500, "Error uploading thumbnail");
      }
      thumbnailUpdate = {
        thumbnail: {
          public_id: thumbnailUpload.public_id,
          url: thumbnailUpload.secure_url,
        },
      };
    }
  }
  //Update video details
  const updateVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title || video.title,
        description: description || video.description,
        category: category || video.category,
        isPublished:
          isPublished !== undefined ? isPublished : video.isPublished,
        tags: tags ? JSON.parse(tags) : video.tags,
        ...thumbnailUpdate,
      },
    },
    { new: true }
  ).populate("owner", "username fullName avatar");
  return res
    .status(200)
    .json(new ApiResponse(200, updateVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  // Check if video exists and belongs to user
  const video = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(404, "Video not found or you don't have permission");
  }

  // Delete video from Cloudinary
  if (video.videoFile?.public_id) {
    await deleteFromCloudinary(video.videoFile.public_id, "video");
  }

  // Delete thumbnail from Cloudinary
  if (video.thumbnail?.public_id) {
    await deleteFromCloudinary(video.thumbnail.public_id);
  }

  // Delete video from database
  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  // Check if video exists and belongs to user
  const video = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(404, "Video not found or you don't have permission");
  }
  //Toggle publish status
  const updateVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: { isPublished: !video.isPublished },
    },
    { new: true }
  ).populate("owner", "username fullName avatar");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updateVideo,
        `Video ${
          updateVideo.isPublished ? "published" : "unpublished"
        } successfully`
      )
    );
});

const shareVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { platform = "general" } = req.query;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  //Get video details
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  //Generate share link
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const videoUrl = `${baseUrl}/api/videos/${videoId}`;
  //Generate platform specific links
  const shareLinks = {
    direct: videoUrl,
    clipboard: videoUrl,
  };
  //Add platform-specific share links
  switch (platform.toLowerCase()) {
    case "facebook":
      shareLinks.facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        videoUrl
      )}`;
      break;

    case "twitter":
      shareLinks.twitter = `https://www.twiter.com/intent/tweet?url=${encodeURIComponent(
        videoUrl
      )}&text=${encodeURIComponent(video.title)}`;
      break;

    case "whatsapp":
      shareLinks.whatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        video.title + " " + videoUrl
      )}&text=${encodeURIComponent(video.title)}`;
      break;

    case "linkedin":
      shareLinks.linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        videoUrl
      )}`;

    case "telegram":
      shareLinks.telegram = `https://t.me/share/url?url=${encodeURIComponent(
        videoUrl
      )}&text=${encodeURIComponent(video.title)}`;
      break;

    case "reddit":
      shareLinks.reddit = `https://reddit.com/submit?url=${encodeURIComponent(
        videoUrl
      )}&title=${encodeURIComponent(video.title)}`;
      break;
    default:
      //For "general, include all share links"
      shareLinks = {
        ...shareLinks,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          videoUrl
        )}`,
        twitter: `https://www.twiter.com/intent/tweet?url=${encodeURIComponent(
          videoUrl
        )}&text=${encodeURIComponent(video.title)}`,

        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(
          video.title + " " + videoUrl
        )}&text=${encodeURIComponent(video.title)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          videoUrl
        )}`,

        telegram: `https://t.me/share/url?url=${encodeURIComponent(
          videoUrl
        )}&text=${encodeURIComponent(video.title)}`,

        reddit: `https://reddit.com/submit?url=${encodeURIComponent(
          videoUrl
        )}&title=${encodeURIComponent(video.title)}`,
      };
      break;
  }
  //Increment the share count (optional)
  await Video.findByIdAndUpdate(videoId, { $inc: { shares: 1 } });
  //Send response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videoId,
        videoTitle: video.title,
        thumbnail: video.thumbnail,
        shareLinks,
      },
      "Video share links generated successfully"
    )
  );
});

module.exports = {
  publishVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  shareVideo,
  
};