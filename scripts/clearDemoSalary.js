require("dotenv").config();
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const MonthlySalary = require("../models/MonthlySalary");

async function main() {
  await connectDB();
  const result = await MonthlySalary.deleteMany({ demo: true });
  console.log(`Removed ${result.deletedCount} demo salary record(s). Regular salary records were not affected.`);
  await mongoose.disconnect();
}
main().catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exitCode = 1; });