const mongoose = require("mongoose");

const monthlySalarySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    baseSalary: { type: Number, min: 0, required: true },
    socialSecurityFund: { type: Number, min: 0, required: true },
    staffContribution: { type: Number, min: 0, required: true },
    bonus: { type: Number, min: 0, default: 0 },
    overtimeHours: { type: Number, min: 0, default: 0 },
    overtimePay: { type: Number, min: 0, default: 0 },
    totalSalary: { type: Number, min: 0, required: true },
    nepaliMonth: { type: Number, min: 1, max: 12, required: true },
    nepaliYear: { type: Number, min: 2000, required: true },
    demo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

monthlySalarySchema.index({ employee: 1, nepaliYear: 1, nepaliMonth: 1 }, { unique: true });
module.exports = mongoose.model("MonthlySalary", monthlySalarySchema);