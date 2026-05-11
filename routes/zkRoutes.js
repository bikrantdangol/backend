// const express = require("express");
// const router = express.Router();
// const {
//   syncAttendanceLogs,
//   addUserToDevice,
//   getDeviceInfo,
//   getDeviceUsers,
//   clearDeviceLogs,
// } = require("../services/zkService");
// const User = require("../models/User");
// const Attendance = require("../models/Attendance");

// const ok = (res, data) => res.json({ success: true, ...data });
// const fail = (res, err, code = 500) =>
//   res.status(code).json({ success: false, message: err.message || err });

// // ─── POST /api/zk/sync ────────────────────────────────────────────────────────
// // Manually trigger sync now (admin dashboard "Sync" button)
// router.post("/sync", async (req, res) => {
//   try {
//     const result = await syncAttendanceLogs();
//     ok(res, { message: "Sync complete", ...result });
//   } catch (err) {
//     fail(res, err);
//   }
// });

// // ─── GET /api/zk/info ─────────────────────────────────────────────────────────
// // Check device connection + firmware info
// router.get("/info", async (req, res) => {
//   try {
//     const info = await getDeviceInfo();
//     ok(res, { connected: true, info });
//   } catch (err) {
//     res
//       .status(503)
//       .json({
//         connected: false,
//         message: "Cannot reach device. Check IP/network.",
//         error: err.message,
//       });
//   }
// });

// // ─── GET /api/zk/users ───────────────────────────────────────────────────────
// // All users stored on the physical device
// router.get("/users", async (req, res) => {
//   try {
//     const users = await getDeviceUsers();
//     ok(res, { users, count: users.length });
//   } catch (err) {
//     fail(res, err);
//   }
// });

// // ─── POST /api/zk/push-user/:userId ──────────────────────────────────────────
// // Push a MongoDB user onto the device so they can enroll fingerprint
// router.post("/push-user/:userId", async (req, res) => {
//   try {
//     const user = await User.findById(req.params.userId).select(
//       "fullName biometricId isActive",
//     );
//     if (!user) return fail(res, new Error("User not found"), 404);
//     if (!user.biometricId)
//       return fail(
//         res,
//         new Error("No biometricId assigned to this user. Edit user first."),
//         400,
//       );
//     if (!user.isActive) return fail(res, new Error("User is inactive"), 400);
//     await addUserToDevice(user.biometricId, user.fullName);
//     ok(res, {
//       message: `${user.fullName} registered on device (biometricId: ${user.biometricId}). Ask them to enroll fingerprint.`,
//     });
//   } catch (err) {
//     fail(res, err);
//   }
// });

// // ─── DELETE /api/zk/clear-logs ───────────────────────────────────────────────
// // Clear logs from device (NOT from MongoDB). Always sync first.
// router.delete("/clear-logs", async (req, res) => {
//   try {
//     await clearDeviceLogs();
//     ok(res, { message: "Device logs cleared. MongoDB records untouched." });
//   } catch (err) {
//     fail(res, err);
//   }
// });

// // ─── GET /api/zk/match ───────────────────────────────────────────────────────
// // Shows device users side by side with MongoDB users.
// // Use this to verify which device user_id maps to which MongoDB user.
// // Helps admin confirm biometricId assignments are correct.
// router.get("/match", async (req, res) => {
//   try {
//     const [deviceUsers, mongoUsers] = await Promise.all([
//       getDeviceUsers(),
//       User.find(
//         { isAdmin: false },
//         { fullName: 1, biometricId: 1, email: 1, isActive: 1 },
//       ).lean(),
//     ]);

//     // For each device user, find the matching MongoDB user
//     const matched = deviceUsers.map((du) => {
//       const matched = mongoUsers.find(
//         (mu) => mu.biometricId === String(du.userId || du.uid),
//       );
//       return {
//         deviceUserId: du.userId || du.uid,
//         deviceName: du.name,
//         mongoUser: matched
//           ? {
//               _id: matched._id,
//               fullName: matched.fullName,
//               email: matched.email,
//             }
//           : null,
//         linked: !!matched,
//       };
//     });

//     // MongoDB users with no device match
//     const unlinked = mongoUsers.filter(
//       (mu) =>
//         !deviceUsers.find(
//           (du) => String(du.userId || du.uid) === mu.biometricId,
//         ),
//     );

//     ok(res, { matched, unlinked });
//   } catch (err) {
//     fail(res, err);
//   }
// });

// module.exports = router;
/**
 * routes/zkRoutes.js
 *
 * Mount in server.js:
 *   app.use('/api/zk', require('./routes/zkRoutes'));
 */
/**
 * routes/zkRoutes.js
 *
 * Mount in server.js:
 *   app.use('/api/zk', require('./routes/zkRoutes'));
 */

const express = require("express");
const router = express.Router();
const {
  syncAttendanceLogs,
  addUserToDevice,
  getDeviceInfo,
  getDeviceUsers,
  clearDeviceLogs,
} = require("../services/zkService");
const User = require("../models/User");

const ok = (res, data) => res.json({ success: true, ...data });
const fail = (res, err, code = 500) =>
  res.status(code).json({ success: false, message: err.message || err });

// ─── POST /api/zk/sync ────────────────────────────────────────────────────────
router.post("/sync", async (req, res) => {
  try {
    const result = await syncAttendanceLogs();
    ok(res, { message: "Sync complete", ...result });
  } catch (err) {
    fail(res, err);
  }
});

// ─── GET /api/zk/info ─────────────────────────────────────────────────────────
router.get("/info", async (req, res) => {
  try {
    const info = await getDeviceInfo();
    ok(res, { connected: true, info });
  } catch (err) {
    res
      .status(503)
      .json({
        connected: false,
        message: "Cannot reach device. Check IP/network.",
        error: err.message,
      });
  }
});

// ─── GET /api/zk/users ────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const users = await getDeviceUsers();
    ok(res, { users, count: users.length });
  } catch (err) {
    fail(res, err);
  }
});

// ─── POST /api/zk/push-user/:userId ──────────────────────────────────────────
router.post("/push-user/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "fullName biometricId isActive",
    );
    if (!user) return fail(res, new Error("User not found"), 404);
    if (!user.biometricId)
      return fail(
        res,
        new Error("No biometricId assigned. Edit user first."),
        400,
      );
    if (!user.isActive) return fail(res, new Error("User is inactive"), 400);
    await addUserToDevice(user.biometricId, user.fullName);
    ok(res, {
      message: `${user.fullName} registered on device (biometricId: ${user.biometricId}). Ask them to enroll fingerprint.`,
    });
  } catch (err) {
    fail(res, err);
  }
});

// ─── DELETE /api/zk/clear-logs ───────────────────────────────────────────────
router.delete("/clear-logs", async (req, res) => {
  try {
    await clearDeviceLogs();
    ok(res, { message: "Device logs cleared. MongoDB records untouched." });
  } catch (err) {
    fail(res, err);
  }
});

// ─── GET /api/zk/match ────────────────────────────────────────────────────────
// Shows device users vs MongoDB users side by side
// Includes all users (admin + non-admin)
router.get("/match", async (req, res) => {
  try {
    const [deviceUsers, mongoUsers] = await Promise.all([
      getDeviceUsers(),
      User.find(
        {},
        { fullName: 1, biometricId: 1, email: 1, isActive: 1 },
      ).lean(),
    ]);

    const matched = deviceUsers.map((du) => {
      const found = mongoUsers.find(
        (mu) => mu.biometricId === String(du.userId || du.uid),
      );
      return {
        deviceUserId: du.userId || du.uid,
        deviceName: du.name,
        mongoUser: found
          ? { _id: found._id, fullName: found.fullName, email: found.email }
          : null,
        linked: !!found,
      };
    });

    const unlinked = mongoUsers.filter(
      (mu) =>
        !deviceUsers.find(
          (du) => String(du.userId || du.uid) === mu.biometricId,
        ),
    );

    ok(res, { matched, unlinked });
  } catch (err) {
    fail(res, err);
  }
});

module.exports = router;
