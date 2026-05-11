const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    fromDate:       { type: Date,   required: true },
    toDate:         { type: Date,   required: true },
    fromDateNepali: { type: String },
    toDateNepali:   { type: String },

    // Working days count (excluding weekends + holidays)
    totalDays: { type: Number, required: true, min: 1 },

    reason: { type: String, required: true, trim: true },

    // Match exactly what the frontend dropdown shows
    leaveType: {
      type: String,
      enum: ['casual', 'sick', 'earned', 'pregnancy'],
      default: 'casual',
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    processedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    processedAt:  { type: Date,   default: null },
    adminNote:    { type: String, default: null },

    // BS year this leave belongs to
    leaveYear:  { type: Number, required: true },

    // BS month number (1-12) the leave starts in — used for carry-forward logic
    leaveMonth: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);

leaveSchema.index({ user: 1, leaveYear: 1 });

const Leave = mongoose.model('Leave', leaveSchema);
module.exports = Leave;
