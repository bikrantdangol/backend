const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Holiday title is required'],
      trim: true,
    },

    // Occasion/description (optional)
    occasion: {
      type: String,
      trim: true,
      default: null,
    },

    date: {
      type: Date,
      required: [true, 'Holiday date is required'],
    },

    // Nepali date string (e.g. "2081-04-01")
    nepaliDate: {
      type: String,
      required: true,
    },

    // Nepali year for filtering
    nepaliYear: {
      type: Number,
      required: true,
    },

    // Added by admin
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Is it visible to all users (always true for now)
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// One holiday per date
holidaySchema.index({ date: 1 }, { unique: true });

const Holiday = mongoose.model('Holiday', holidaySchema);
module.exports = Holiday;