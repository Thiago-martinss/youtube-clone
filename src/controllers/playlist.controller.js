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

module.exports = {
  createPlaylist,
  addVideoToPlaylist
};