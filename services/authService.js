const User = require("../models/User");
const generateToken = require("../utils/generateToken");

/**
 * Register first admin - only works if no admin exists
 */
const registerAdmin = async ({ fullName, email, password }) => {
  // Check if any admin already exists
  const existingAdmin = await User.findOne({ isAdmin: true });
  if (existingAdmin) {
    throw new Error("Admin already registered. Registration is closed.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already in use");
  }

  const admin = await User.create({
    fullName,
    email,
    password,
    role: "admin",
    isAdmin: true,
    isActive: true,
  });

  return {
    user: admin.toJSON(),
    token: generateToken(admin._id, admin.isAdmin),
  };
};

/**
 * Login - for both admin and users
 */
const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("Your account has been deactivated. Please contact admin.");
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  return {
    user: user.toJSON(),
    token: generateToken(user._id, user.isAdmin),
  };
};

/**
 * Change password for logged-in user
 */
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) throw new Error("Current password is incorrect");

  if (newPassword.length < 6)
    throw new Error("New password must be at least 6 characters");

  user.password = newPassword;
  await user.save();

  return { message: "Password changed successfully" };
};

module.exports = { registerAdmin, loginUser, changePassword };
