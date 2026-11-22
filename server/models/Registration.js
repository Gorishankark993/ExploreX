const mongoose = require("mongoose");
const crypto = require("crypto");

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },

    // Unique token used to generate the student's QR code
    qrToken: {
      type: String,
      unique: true,
      required: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },

    // Attendance tracking
    attendanceStatus: {
      type: String,
      enum: ["registered", "attended"],
      default: "registered",
    },

    attendedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate registrations for the same event
registrationSchema.index(
  { user: 1, event: 1 },
  { unique: true }
);

const Registration = mongoose.model(
  "Registration",
  registrationSchema
);

module.exports = Registration;