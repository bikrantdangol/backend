const mongoose = require("mongoose");

const salaryConfigSchema = new mongoose.Schema(
  {
    bonusEnabled: { type: Boolean, default: false },
    bonusAmount: { type: Number, default: 0 },
    overtimeEnabled: { type: Boolean, default: false },
    overtimeRate: { type: Number, default: 0 }, // per hour
    taxRate: { type: Number, default: 1 }, // percentage
  },
  { timestamps: true },
);

// Always keep a single document (singleton)
salaryConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model("SalaryConfig", salaryConfigSchema);