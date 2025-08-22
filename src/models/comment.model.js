const mongoose = require("mongoose");
const mongooseAggregatePaginate = require("mongoose-aggregate-paginate-v2");

//Schema
const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content  is required"],
      trim: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "video is required"],
      ref: "Video",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User is required"],
      ref: "User",
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  },
  { timestamps: true }
);
//Add the mongoose-aggregate-paginate plugin
commentSchema.plugin(mongooseAggregatePaginate);

//Compile the schema to form a model
const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
