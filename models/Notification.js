/**
 * models/Notification.js
 *
 * Notifications are created automatically when:
 *   USER sees:
 *     - Admin added a holiday
 *     - Admin added an occasion (birthday/anniversary)
 *     - Their leave request was approved
 *     - Their leave request was rejected
 *
 *   ADMIN sees:
 *     - A user submitted a leave request
 *
 * Storage: lean — no versionKey, no timestamps body
 * Estimated size: ~150 bytes per doc
 */

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Notification type — used by frontend to show correct icon/color
    type: {
      type: String,
      enum: [
        "leave_approved", // user's leave was approved
        "leave_rejected", // user's leave was rejected
        "leave_requested", // admin: a user requested leave
        "holiday_added", // admin added a holiday
        "occasion", // birthday / work anniversary
      ],
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    // Optional reference to the related document
    refModel: {
      type: String,
      enum: ["Leave", "Holiday", "Occasion"],
      default: null,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },

    read: { type: Boolean, default: false },
  },
  {
    timestamps: true, // we need createdAt for "2 hours ago" display
    versionKey: false,
  },
);

// Index for fast "get my notifications" queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
