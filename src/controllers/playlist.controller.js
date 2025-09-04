const mongoose = require("mongoose");
const Playlist = require("../models/playlist.model");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description, isPublic = true } = req.body; 
  if (!name || name.trim() === "") {
    throw new ApiError(400, "Playlist name is required");
  }
  //Create playlist
  const playlist = await Playlist.create({
    name,
    description: description || "",
    owner: req.user._id,
    isPublic: Boolean(isPublic),
  });
  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created"));
});
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist and video Id are required");
  }
  // Check if playlist exists and belongs to user
  const playlist = await Playlist.findOne({
    _id: playlistId,
    owner: req.user._id,
  });
  if (!playlist) {
    throw new ApiError(404, "Playlist not found or you don't have permission");
  }

  // Check if video is already in playlist
  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in the playlist");
  }
  //Add video to playlist
  playlist.videos.push(videoId);
  await playlist.save();
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added to playlist"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userIdToUse = userId || req.user._id;
  if (!userIdToUse) {
    throw new ApiError(400, "User ID is required");
  }
  const isOwner = req.user._id.toString() === userIdToUse.toString();
  // If not the owner, only return public playlists
  const matchCondition = {
    owner: new mongoose.Types.ObjectId(userIdToUse),
    ...(isOwner ? {} : { isPublic: true }),
  };
  const playlists = await Playlist.aggregate([
    {
      $match: matchCondition,
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
              thumbnail: 1,
              duration: 1,
              views: 1,
              createdAt: 1,
              videoFile: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        videoCount: { $size: "$videos" },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist ID is required");
  }
  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
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
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              as: "owner",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
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
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
        videoCount: { $size: "$videos" },
      },
    },
  ]);

  if (!playlist.length) {
    throw new ApiError(404, "Playlist not found");
  }
  const playlistData = playlist[0];
  // Check if playlist is private and user is not the owner
  if (
    !playlistData.isPublic &&
    (!req.user || playlistData.owner._id.toString() !== req.user._id.toString())
  ) {
    throw new ApiError(403, "You don't have permission to view this playlist");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlistData, "Playlist fetched successfully"));
});

module.exports = {
  createPlaylist,
  addVideoToPlaylist,
  getUserPlaylists,
  getPlaylistById,
};