const mongoose = require('mongoose');

const occasionSchema = new mongoose.Schema(
  {
    // The user this occasion belongs to
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    type: {
      type: String,
      enum: ['birthday', 'work_anniversary', 'other'],
      required: [true, 'Occasion type is required'],
    },

    title: {
      type: String,
      trim: true,
      // Auto-generated if not provided
    },

    // The actual date (for birthday: birth date, for anniversary: join date)
    date: {
      type: Date,
      required: true,
    },

    // Nepali date string
    nepaliDate: {
      type: String,
    },

    // Day and month for recurring yearly notifications (ignores year)
    dayOfYear_month: { type: Number }, // 1-12
    dayOfYear_day: { type: Number },   // 1-31

    isActive: {
      type: Boolean,
      default: true,
    },

    // Added by admin
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Occasion = mongoose.model('Occasion', occasionSchema);
module.exports = Occasion;