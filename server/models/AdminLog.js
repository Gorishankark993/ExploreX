const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "USER_BLOCKED",
        "USER_UNBLOCKED",
        "ROLE_CHANGED",
        "EVENT_CANCELLED",
        "REVIEW_DELETED",
      ],
      required: true,
    },

    targetType: {
      type: String,
      enum: ["User", "Event", "Review"],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const AdminLog = mongoose.model("AdminLog", adminLogSchema);

module.exports = AdminLog;