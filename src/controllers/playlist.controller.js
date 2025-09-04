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

module.exports = {
  createPlaylist,
};