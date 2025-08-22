const mongoose = require("mongoose");

//Schema
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Types.ObjectId,
      required: [true, "Recipient is required"],
      ref: "User",
    },
    sender: {
      type: mongoose.Types.ObjectId,
      required: [true, "Recipient is required"],
      ref: "User",
    },
    type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: ["SUBSCRIPTION", "COMMENT", "REPLY", "VIDEO"],
    },

    content: {
      type: String,
      required: [true, "Content  is required"],
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

//Compile the schema to form a model
const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
