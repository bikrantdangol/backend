/**
 * routes/notificationRoutes.js
 *
 * Mount in server.js:
 *   app.use('/api/notifications', require('./routes/notificationRoutes'));
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

// All routes require login — both users and admins
router.get("/", protect, ctrl.getMyNotifications); // get my notifications
router.put("/read-all", protect, ctrl.markAllAsRead); // mark all read
router.delete("/clear-read", protect, ctrl.clearReadNotifications); // delete all read
router.put("/:id/read", protect, ctrl.markAsRead); // mark one read
router.delete("/:id", protect, ctrl.deleteNotification); // delete one

module.exports = router;
