const mongoose = require("mongoose");

//Schema
const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Playlist is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

//Compile the schema to form a model
const Playlist = mongoose.model("Playlist", playlistSchema);

module.exports = Playlist;
