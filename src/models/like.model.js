const mongoose = require("mongoose");

//Schema
const likeSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: mongoose.Types.ObjectId,
      ref: "Comment",
    },
    likedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure that a 'like' must refer to either a video or a comment, but not both
likeSchema.pre("save", function (next) {
  if (!this.video && !this.comment) {
    const error = new Error("A like mut refer to either a video or a comment");
    return next(error);
  }
  if ((this.video && this, this.comment)) {
    const error = new Error(
      "A like mut refer to either a video or a comment, but not both"
    );
    return next(error);
  }
  next();
});
// Compound index to ensure a user can only like a video or comment once
likeSchema.index({ video: 1, likedBy: 1 }, { unique: true, sparse: true });

likeSchema.index({ comment: 1, likedBy: 1 }, { unique: true, sparse: true });
//Compile the schema to form a model
const Like = mongoose.model("Like", likeSchema);

module.exports = Like;
