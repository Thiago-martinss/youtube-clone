const User = require("../models/user.model");
const Video = require("../models/video.model");
const ApiError = require("../utils/ApiError");
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


const updateChannelInfo = asyncHandler(async (req, res) => {
  const { channelDescription, channelTags, socialLinks } = req.body;
  //Prepare update object
  const updateData = {};
  if (channelDescription !== undefined) {
    updateData.channelDescription = channelDescription;
  }
  if (channelTags !== undefined) {
    updateData.channelDescription = channelDescription;
    updateData.channelTags = Array.isArray(channelTags)
      ? channelTags
      : JSON.parse(channelTags);
  }

  if (socialLinks !== undefined) {
    updateData.socialLinks =
      typeof socialLinks === "object" ? socialLinks : JSON.parse(socialLinks);
  }

  // Update channel cover image if provided
  let coverImageUpdate = {};
  if (req?.files?.coverImage?.[0]?.path) {
    const coverImageLocalPath = req?.files?.coverImage?.[0]?.path;
    // Delete old cover image if exists
    if (req?.user?.coverImage) {
      await deleteFromCloudinary(req?.user?.coverImage?.public_id, "/image");
    }
    //Upload new cover image
    const uploadResult = await uploadToCloudinary(
      coverImageLocalPath,
      "youtube/cover-images"
    );
    if (!uploadResult) {
      throw new ApiError(500, "Error uploading cover image");
    }
    coverImageUpdate.coverImage = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    };
  }

  //Merge updates
  const updateObject = {
    ...updateData,
    ...coverImageUpdate,
  };

  //Update the user
  const updatedUser = await User.findByIdAndUpdate(req.user._id, updateObject, {
    new: true,
  }).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Channel updated successfully"));
});


const updateNotificationSettings = asyncHandler(async (req, res) => {
  const { emailNotification, subscriptionActivity, commentActivity } = req.body;

  //Prepare update object
  const notificationSettings = {};
  if (emailNotification !== undefined) {
    notificationSettings["notificationSettings.emailNotification"] =
      emailNotification;
  }

  if (subscriptionActivity !== undefined) {
    notificationSettings["notificationSettings.subscriptionActivity"] =
      subscriptionActivity;
  }

  if (commentActivity !== undefined) {
    notificationSettings["notificationSettings.commentActivity"] =
      commentActivity;
  }

  if (Object.keys(notificationSettings).length === 0) {
    throw new ApiError(400, "No settings provided to update");
  }
  //Update the user
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: notificationSettings,
    },
    { new: true }
  ).select("notificationSetting");
  if (!updatedUser) {
    throw new ApiError(500, "Error updating notification settings");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser.notificationSettings,
        "Notification settings updated successfully"
      )
    );
});


const getChannelVideos = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;
  if (!username) {
    throw new ApiError(400, "Username is required");
  }
  //Find channel by username
  const channel = await User.findOne({ username });
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }
  //Build video query
  const videoQuery = {
    owner: channel._id,
    isPublished: true,
  };
  // If current user is the channel owner, show unpublished videos too
  if (req.user && req.user._id.toString() === channel._id.toString()) {
    delete videoQuery.isPublished;
  }
  //Get videos with pagination
  const videos = await Video.find(videoQuery)
    .sort({
      [sortBy]: sortType === "asc" ? 1 : -1,
    })
    .skip(Number(page - 1) * Number(limit))
    .limit(Number(limit));
  // Get total count for pagination
  const totalVideos = await Video.countDocuments(videoQuery);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        totalVideos,
        currentPage: Number(page),
        totalPages: Math.ceil(totalVideos / Number(limit)),
      },
      "Channel videos fetched successfully"
    )
  );
});

//@Desc: Generate shareable link for a channel
//@route: GET /api/v1/channels/:username/share
//@Access:Public
const getChannelShareLink = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  //Find channel by username
  const channel = await User.findOne({ username });
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }
  // Generate share link (in a real app, this might integrate with a URL shortener service)
  const shareLink = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/channels/${username}`;
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { shareLink },
        "Channel share generated successfully"
      )
    );
});

module.exports = {
  getChannelInfo,
  updateChannelInfo,
  updateNotificationSettings,
  getChannelVideos,
  getChannelShareLink,
};
