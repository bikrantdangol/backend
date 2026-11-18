require("dotenv").config();
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const User = require("../models/User");
const MonthlySalary = require("../models/MonthlySalary");

async function main() {
  await connectDB();
  const nepaliYear = Number(process.argv[2] || 2083);
  const nepaliMonth = Number(process.argv[3] || 1);
  if (!Number.isInteger(nepaliYear) || !Number.isInteger(nepaliMonth) || nepaliMonth < 1 || nepaliMonth > 12) throw new Error("Usage: node scripts/seedDemoSalary.js [BS_YEAR] [BS_MONTH 1-12]");
  const existing = await MonthlySalary.exists({ nepaliYear, nepaliMonth });
  if (existing) throw new Error(`Salary records already exist for ${nepaliMonth}/${nepaliYear}; demo data was not added.`);
  const users = await User.find({ isAdmin: false, isActive: true }).limit(3).select("fullName role baseSalary");
  if (!users.length) throw new Error("Add at least one active staff account before creating salary demo records.");
  const records = users.map((user, index) => {
    const baseSalary = Number(user.baseSalary) || 30000 + index * 5000;
    const bonus = [1500, 0, 2500][index % 3];
    const overtimeHours = [4, 7.5, 2][index % 3];
    const overtimePay = overtimeHours * 150;
    const staffContribution = Math.round(baseSalary * 0.11 * 100) / 100;
    return { employee: user._id, name: user.fullName, role: user.role, baseSalary, socialSecurityFund: Math.round(baseSalary * 0.2 * 100) / 100, staffContribution, bonus, overtimeHours, overtimePay, totalSalary: baseSalary - staffContribution + bonus + overtimePay, nepaliYear, nepaliMonth, demo: true };
  });
  await MonthlySalary.insertMany(records);
  console.log(`Created ${records.length} demo salary record(s) for BS ${nepaliYear}/${nepaliMonth}. Remove them with: node scripts/clearDemoSalary.js`);
  await mongoose.disconnect();
}
main().catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exitCode = 1; });