/**
 * User Service — userService.js
 *
 * CRUD operations for staff users (non-admin).
 * Auto-syncs with ZKTeco biometric device when biometricId is set.
 *
 * ZKTeco integration points:
 *   • createUser  — pushes new user to device if biometricId provided
 *   • updateUser  — re-pushes if biometricId is added or changed
 *
 * If the device is offline during push, the MongoDB record is still
 * saved. Retry the push manually via:
 *   POST /api/zk/push-user/:userId
 */

// const User = require("../models/User");

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// /**
//  * Attempt to push a user to the ZKTeco device.
//  * Logs a warning (does NOT throw) if the device is unreachable.
//  *
//  * @param {string|number} biometricId
//  * @param {string}        fullName
//  * @param {string}        mongoId       - used in the retry hint message
//  */
// const tryPushToDevice = async (biometricId, fullName, mongoId) => {
//   try {
//     const { addUserToDevice } = require("./zkService");
//     await addUserToDevice(biometricId, fullName);
//     console.log(`[ZK] User pushed to device — biometricId: ${biometricId}`);
//   } catch (zkErr) {
//     console.warn(
//       `[ZK] Device push failed for biometricId ${biometricId}: ${zkErr.message}`,
//     );
//     console.warn(`[ZK] Retry via: POST /api/zk/push-user/${mongoId}`);
//   }
// };

// // ─── 1. Create user ──────────────────────────────────────────────────────────

// /**
//  * Creates a new staff user in MongoDB.
//  * If biometricId is supplied:
//  *   - Checks it isn't already assigned to another user
//  *   - Pushes user record to ZKTeco device for fingerprint enrollment
//  *
//  * @param {object} payload
//  * @returns {object} created user (password excluded)
//  */
// const createUser = async ({
//   fullName,
//   email,
//   password,
//   role,
//   joinedDate,
//   phone,
//   department,
//   biometricId,
// }) => {
//   // ── Uniqueness checks ──
//   const existing = await User.findOne({ email });
//   if (existing) throw new Error("Email already in use");

//   if (biometricId) {
//     const bioExists = await User.findOne({ biometricId });
//     if (bioExists)
//       throw new Error(
//         `Biometric ID ${biometricId} is already assigned to another user`,
//       );
//   }

//   // ── Create MongoDB record ──
//   const user = await User.create({
//     fullName,
//     email,
//     password,
//     role,
//     joinedDate: joinedDate || Date.now(),
//     phone,
//     department,
//     biometricId: biometricId || null,
//     isAdmin: false,
//     isActive: true,
//   });

//   // ── Push to ZKTeco device ──
//   if (biometricId) {
//     await tryPushToDevice(biometricId, fullName, user._id);
//   }

//   return user.toJSON();
// };

// // ─── 2. Get all users ────────────────────────────────────────────────────────

// /**
//  * Returns all non-admin users sorted by creation date (newest first).
//  */
// const getAllUsers = async () => {
//   return await User.find({ isAdmin: false })
//     .select("-password")
//     .sort({ createdAt: -1 });
// };

// // ─── 3. Get single user ──────────────────────────────────────────────────────

// /**
//  * Returns a single user by MongoDB _id.
//  * @throws if user not found
//  */
// const getUserById = async (userId) => {
//   const user = await User.findById(userId).select("-password");
//   if (!user) throw new Error("User not found");
//   return user;
// };

// // ─── 4. Update user ──────────────────────────────────────────────────────────

// /**
//  * Updates user fields (password and isAdmin are protected and ignored).
//  * If biometricId is newly added or changed, re-pushes to ZKTeco device.
//  *
//  * @param {string} userId     - MongoDB _id
//  * @param {object} updateData - fields to update
//  * @returns {object} updated user (password excluded)
//  */
// const updateUser = async (userId, updateData) => {
//   // Protect sensitive / immutable fields
//   delete updateData.password;
//   delete updateData.isAdmin;

//   // Fetch current biometricId to detect changes
//   const oldUser = await User.findById(userId).select("biometricId fullName");
//   if (!oldUser) throw new Error("User not found");

//   // Prevent duplicate biometricId assignment
//   if (
//     updateData.biometricId &&
//     updateData.biometricId !== oldUser.biometricId
//   ) {
//     const bioExists = await User.findOne({
//       biometricId: updateData.biometricId,
//       _id: { $ne: userId },
//     });
//     if (bioExists)
//       throw new Error(
//         `Biometric ID ${updateData.biometricId} is already assigned to another user`,
//       );
//   }

//   const user = await User.findByIdAndUpdate(userId, updateData, {
//     new: true,
//     runValidators: true,
//   }).select("-password");
//   if (!user) throw new Error("User not found");

//   // Re-push to device if biometricId was newly set or changed
//   const newBioId = updateData.biometricId;
//   if (newBioId && newBioId !== oldUser.biometricId) {
//     await tryPushToDevice(newBioId, user.fullName, userId);
//   }

//   return user;
// };

// // ─── 5. Deactivate user (soft delete) ────────────────────────────────────────

// /**
//  * Marks a user as inactive — they cannot log in.
//  * The user record remains in MongoDB and on the device.
//  * Remove from device manually if needed (fingerprint data remains).
//  *
//  * @note Cannot deactivate admin accounts.
//  */
// const deactivateUser = async (userId) => {
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");
//   if (user.isAdmin) throw new Error("Cannot deactivate admin account");

//   user.isActive = false;
//   await user.save();

//   return {
//     message: `${user.fullName} has been deactivated. They can no longer log in. Remove from ZKTeco device manually if required.`,
//   };
// };

// // ─── 6. Reactivate user ──────────────────────────────────────────────────────

// /**
//  * Re-enables a deactivated user so they can log in again.
//  */
// const reactivateUser = async (userId) => {
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");

//   user.isActive = true;
//   await user.save();

//   return { message: `${user.fullName} has been reactivated` };
// };

// // ─── 7. Delete user (permanent) ──────────────────────────────────────────────

// /**
//  * Permanently removes a user from MongoDB.
//  * The user's record and fingerprint on the ZKTeco device are NOT
//  * automatically removed — do this manually on the device.
//  *
//  * @note Cannot delete admin accounts.
//  */
// const deleteUser = async (userId) => {
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");
//   if (user.isAdmin) throw new Error("Cannot delete admin account");

//   await User.findByIdAndDelete(userId);

//   return {
//     message: `${user.fullName} has been permanently deleted from the database. Remember to remove them from the ZKTeco device manually.`,
//   };
// };

// // ─── 8. Dashboard stats ──────────────────────────────────────────────────────

// /**
//  * Returns aggregate counts for the admin dashboard.
//  * @returns {{ totalUsers, activeUsers, inactiveUsers }}
//  */
// const getDashboardStats = async () => {
//   const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
//     User.countDocuments({ isAdmin: false }),
//     User.countDocuments({ isAdmin: false, isActive: true }),
//     User.countDocuments({ isAdmin: false, isActive: false }),
//   ]);
//   return { totalUsers, activeUsers, inactiveUsers };
// };

// // ─── Exports ──────────────────────────────────────────────────────────────────

// module.exports = {
//   createUser,
//   getAllUsers,
//   getUserById,
//   updateUser,
//   deactivateUser,
//   reactivateUser,
//   deleteUser,
//   getDashboardStats,
// };

/**
 * User Service — userService.js
 *
 * CRUD operations for staff users (non-admin).
 * Auto-syncs with ZKTeco biometric device when biometricId is set.
 *
 * ZKTeco integration points:
 *   • createUser  — pushes new user to device if biometricId provided
 *   • updateUser  — re-pushes if biometricId is added or changed
 *
 * If the device is offline during push, the MongoDB record is still
 * saved. Retry the push manually via:
 *   POST /api/zk/push-user/:userId
 */

const User = require("../models/User");
const { sendWelcomeEmail } = require("./emailService");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Attempt to push a user to the ZKTeco device.
 * Logs a warning (does NOT throw) if the device is unreachable.
 *
 * @param {string|number} biometricId
 * @param {string}        fullName
 * @param {string}        mongoId       - used in the retry hint message
 */
const tryPushToDevice = async (biometricId, fullName, mongoId) => {
  try {
    const { addUserToDevice } = require("./zkService");
    await addUserToDevice(biometricId, fullName);
    console.log(`[ZK] User pushed to device — biometricId: ${biometricId}`);
  } catch (zkErr) {
    console.warn(
      `[ZK] Device push failed for biometricId ${biometricId}: ${zkErr.message}`,
    );
    console.warn(`[ZK] Retry via: POST /api/zk/push-user/${mongoId}`);
  }
};

// ─── 1. Create user ──────────────────────────────────────────────────────────

/**
 * Creates a new staff user in MongoDB.
 * If biometricId is supplied:
 *   - Checks it isn't already assigned to another user
 *   - Pushes user record to ZKTeco device for fingerprint enrollment
 *
 * @param {object} payload
 * @returns {object} created user (password excluded)
 */
const createUser = async ({
  fullName,
  email,
  password,
  role,
  joinedDate,
  phone,
  department,
  biometricId,
  employeeId,
}) => {
  // ── Uniqueness checks ──
  const existing = await User.findOne({ email });
  if (existing) throw new Error("Email already in use");

  if (biometricId) {
    const bioExists = await User.findOne({ biometricId });
    if (bioExists)
      throw new Error(
        `Biometric ID ${biometricId} is already assigned to another user`,
      );
  }

  // ── Create MongoDB record ──
  const user = await User.create({
    fullName,
    email,
    password,
    role,
    joinedDate: joinedDate || Date.now(),
    phone,
    department,
    biometricId: biometricId || null,
    employeeId: employeeId || null,
    isAdmin: false,
    isActive: true,
  });

  // ── Push to ZKTeco device ──
  if (biometricId) {
    await tryPushToDevice(biometricId, fullName, user._id);
  }

  // Send welcome email with credentials
  await sendWelcomeEmail({
    fullName,
    email,
    password, // plain password — before hashing it's still available here
    role,
    employeeId,
  });

  return user.toJSON();
};

// ─── 2. Get all users ────────────────────────────────────────────────────────

/**
 * Returns all non-admin users sorted by creation date (newest first).
 */
const getAllUsers = async () => {
  return await User.find({ isAdmin: false })
    .select("-password")
    .sort({ createdAt: -1 });
};

// ─── 3. Get single user ──────────────────────────────────────────────────────

/**
 * Returns a single user by MongoDB _id.
 * @throws if user not found
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) throw new Error("User not found");
  return user;
};

// ─── 4. Update user ──────────────────────────────────────────────────────────

/**
 * Updates user fields (password and isAdmin are protected and ignored).
 * If biometricId is newly added or changed, re-pushes to ZKTeco device.
 *
 * @param {string} userId     - MongoDB _id
 * @param {object} updateData - fields to update
 * @returns {object} updated user (password excluded)
 */
const updateUser = async (userId, updateData) => {
  // Protect sensitive / immutable fields
  delete updateData.password;
  delete updateData.isAdmin;

  // Fetch current biometricId to detect changes
  const oldUser = await User.findById(userId).select("biometricId fullName");
  if (!oldUser) throw new Error("User not found");

  // Prevent duplicate biometricId assignment
  if (
    updateData.biometricId &&
    updateData.biometricId !== oldUser.biometricId
  ) {
    const bioExists = await User.findOne({
      biometricId: updateData.biometricId,
      _id: { $ne: userId },
    });
    if (bioExists)
      throw new Error(
        `Biometric ID ${updateData.biometricId} is already assigned to another user`,
      );
  }

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");
  if (!user) throw new Error("User not found");

  // Re-push to device if biometricId was newly set or changed
  const newBioId = updateData.biometricId;
  if (newBioId && newBioId !== oldUser.biometricId) {
    await tryPushToDevice(newBioId, user.fullName, userId);
  }

  return user;
};

// ─── 5. Deactivate user (soft delete) ────────────────────────────────────────

/**
 * Marks a user as inactive — they cannot log in.
 * The user record remains in MongoDB and on the device.
 * Remove from device manually if needed (fingerprint data remains).
 *
 * @note Cannot deactivate admin accounts.
 */
const deactivateUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.isAdmin) throw new Error("Cannot deactivate admin account");

  user.isActive = false;
  await user.save();

  return {
    message: `${user.fullName} has been deactivated. They can no longer log in. Remove from ZKTeco device manually if required.`,
  };
};

// ─── 6. Reactivate user ──────────────────────────────────────────────────────

/**
 * Re-enables a deactivated user so they can log in again.
 */
const reactivateUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.isActive = true;
  await user.save();

  return { message: `${user.fullName} has been reactivated` };
};

// ─── 7. Delete user (permanent) ──────────────────────────────────────────────

/**
 * Permanently removes a user from MongoDB.
 * The user's record and fingerprint on the ZKTeco device are NOT
 * automatically removed — do this manually on the device.
 *
 * @note Cannot delete admin accounts.
 */
const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.isAdmin) throw new Error("Cannot delete admin account");

  await User.findByIdAndDelete(userId);

  return {
    message: `${user.fullName} has been permanently deleted from the database. Remember to remove them from the ZKTeco device manually.`,
  };
};

// ─── 8. Dashboard stats ──────────────────────────────────────────────────────

/**
 * Returns aggregate counts for the admin dashboard.
 * @returns {{ totalUsers, activeUsers, inactiveUsers }}
 */
const getDashboardStats = async () => {
  const [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
    User.countDocuments({ isAdmin: false }),
    User.countDocuments({ isAdmin: false, isActive: true }),
    User.countDocuments({ isAdmin: false, isActive: false }),
  ]);
  return { totalUsers, activeUsers, inactiveUsers };
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  reactivateUser,
  deleteUser,
  getDashboardStats,
};
