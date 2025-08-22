const mongoose = require("mongoose");

//Schema
const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to ensure a user can only subscribe to a channel once
subscriptionSchema.index(
  {
    subscriber: 1,
    channel: 1,
  },
  { unique: true }
);
//Compile the schema to form a model
const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;
