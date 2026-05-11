// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const OFFICE_RULES = require("../constants/officeRules");

// const userSchema = new mongoose.Schema(
//   {
//     fullName: {
//       type: String,
//       required: [true, "Full name is required"],
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: [true, "Email is required"],
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },
//     password: {
//       type: String,
//       required: [true, "Password is required"],
//       minlength: 6,
//     },
//     role: {
//       type: String,
//       enum: Object.values(OFFICE_RULES.ROLES),
//       default: OFFICE_RULES.ROLES.OFFICER,
//     },
//     isAdmin: {
//       type: Boolean,
//       default: false,
//     },
//     isActive: {
//       type: Boolean,
//       default: true, // Admin can deactivate (soft delete) users
//     },
//     joinedDate: {
//       type: Date,
//       default: Date.now, // Admin can manually set this
//     },
//     // Profile info
//     phone: { type: String, trim: true },
//     address: { type: String, trim: true },
//     department: { type: String, trim: true },
//     position: { type: String, trim: true },

//     // Biometric device employee ID (for ZKTeco integration later)
//     biometricId: {
//       type: String,
//       default: null,
//     },

//     // Password reset
//     passwordChangedAt: { type: Date },
//   },
//   {
//     timestamps: true,
//   },
// );

// // Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   this.passwordChangedAt = Date.now();
//   next();
// });

// // Compare password method
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// // Remove password from JSON output
// userSchema.methods.toJSON = function () {
//   const obj = this.toObject();
//   delete obj.password;
//   return obj;
// };

// const User = mongoose.model("User", userSchema);
// module.exports = User;
/**
 * User Model — with biometricId for ZKTeco integration
 *
 * Storage tips:
 *  - versionKey: false  saves ~12 bytes per document
 *  - Only store fields you actually use
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const OFFICE_RULES = require("../constants/officeRules");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: Object.values(OFFICE_RULES.ROLES),
      default: OFFICE_RULES.ROLES.OFFICER,
    },
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    joinedDate: { type: Date, default: Date.now },
    photoUrl: { type: String, default: null },
    // Optional profile fields
    // inside userSchema
    phone: { type: String, default: "" },
    department: { type: String, default: "" },

    /**
     * ZKTeco biometric device user ID.
     * Must be a unique numeric STRING (e.g. "1", "2", "3"...)
     * This is the ID stored on the physical device.
     * Admin assigns this when creating a user.
     * Leave null if user is not enrolled on the device yet.
     */
    biometricId: { type: String, default: null, sparse: true },

    passwordChangedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false, // saves ~12 bytes per doc
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = Date.now();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
