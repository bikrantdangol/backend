/**
 * services/notificationService.js
 *
 * All notification creation logic lives here.
 * Other services call these functions after their main action.
 *
 * Triggers:
 *   createLeaveRequestedNotif  → called when user submits leave (notifies ALL admins)
 *   createLeaveApprovedNotif   → called when admin approves leave (notifies the user)
 *   createLeaveRejectedNotif   → called when admin rejects leave  (notifies the user)
 *   createHolidayNotif         → called when admin adds holiday   (notifies ALL active users)
 *   createOccasionNotif        → called when admin adds occasion  (notifies ALL active users)
 */

const Notification = require("../models/Notification");
const User = require("../models/User");

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Get all active admin user IDs */
const getAdminIds = async () => {
  const admins = await User.find(
    { isAdmin: true, isActive: true },
    { _id: 1 },
  ).lean();
  return admins.map((a) => a._id);
};

/** Get all active non-admin user IDs */
const getAllUserIds = async () => {
  const users = await User.find({ isActive: true }, { _id: 1 }).lean();
  return users.map((u) => u._id);
};

/** Bulk insert notifications for multiple recipients */
const bulkCreate = async (recipientIds, fields) => {
  if (!recipientIds || recipientIds.length === 0) return;
  const docs = recipientIds.map((id) => ({ recipient: id, ...fields }));
  await Notification.insertMany(docs, { ordered: false });
};

// ─── Leave notifications ──────────────────────────────────────────────────────

/**
 * Notify ALL admins when a user submits a leave request.
 * @param {object} leave  - Leave document
 * @param {object} user   - User who requested leave { fullName }
 */
const createLeaveRequestedNotif = async (leave, user) => {
  const adminIds = await getAdminIds();
  await bulkCreate(adminIds, {
    type: "leave_requested",
    title: "New Leave Request",
    message: `${user.fullName} requested leave from ${leave.fromDateNepali} to ${leave.toDateNepali} (${leave.totalDays} day${leave.totalDays > 1 ? "s" : ""}).`,
    refModel: "Leave",
    refId: leave._id,
  });
};

/**
 * Notify the user when admin approves their leave.
 */
const createLeaveApprovedNotif = async (leave) => {
  await Notification.create({
    recipient: leave.user,
    type: "leave_approved",
    title: "Leave Approved ✓",
    message: `Your leave from ${leave.fromDateNepali} to ${leave.toDateNepali} (${leave.totalDays} day${leave.totalDays > 1 ? "s" : ""}) has been approved.`,
    refModel: "Leave",
    refId: leave._id,
  });
};

/**
 * Notify the user when admin rejects their leave.
 */
const createLeaveRejectedNotif = async (leave) => {
  const msg = leave.adminNote
    ? `Your leave from ${leave.fromDateNepali} to ${leave.toDateNepali} was rejected. Reason: ${leave.adminNote}`
    : `Your leave from ${leave.fromDateNepali} to ${leave.toDateNepali} has been rejected.`;

  await Notification.create({
    recipient: leave.user,
    type: "leave_rejected",
    title: "Leave Rejected",
    message: msg,
    refModel: "Leave",
    refId: leave._id,
  });
};

// ─── Holiday notifications ────────────────────────────────────────────────────

/**
 * Notify ALL active users when admin adds a holiday.
 */
const createHolidayNotif = async (holiday) => {
  const allUserIds = await getAllUserIds();
  await bulkCreate(allUserIds, {
    type: "holiday_added",
    title: `Holiday: ${holiday.title}`,
    message: holiday.occasion
      ? `${holiday.title} on ${holiday.nepaliDate}. ${holiday.occasion}`
      : `${holiday.title} has been declared as a holiday on ${holiday.nepaliDate}.`,
    refModel: "Holiday",
    refId: holiday._id,
  });
};

// ─── Occasion notifications ───────────────────────────────────────────────────

/**
 * Notify ALL active users when an occasion is added (birthday/anniversary).
 */
const createOccasionNotif = async (occasion, personName) => {
  const allUserIds = await getAllUserIds();
  const typeLabel =
    occasion.type === "birthday" ? "🎂 Birthday" : "🎉 Work Anniversary";

  await bulkCreate(allUserIds, {
    type: "occasion",
    title: `${typeLabel}: ${personName}`,
    message: `${occasion.title} — ${occasion.nepaliDate}`,
    refModel: "Occasion",
    refId: occasion._id,
  });
};

// ─── Read / fetch ─────────────────────────────────────────────────────────────

/**
 * Get notifications for a user, newest first.
 * Returns unread count + list.
 */
const getUserNotifications = async (userId, limit = 20) => {
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
};

/**
 * Mark one notification as read.
 */
const markAsRead = async (notifId, userId) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: notifId, recipient: userId },
    { $set: { read: true } },
    { new: true },
  );
  if (!notif) throw new Error("Notification not found");
  return notif;
};

/**
 * Mark ALL notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true } },
  );
  return { message: "All notifications marked as read" };
};

/**
 * Delete a notification.
 */
const deleteNotification = async (notifId, userId) => {
  await Notification.findOneAndDelete({ _id: notifId, recipient: userId });
  return { message: "Notification deleted" };
};

/**
 * Delete all read notifications for a user (cleanup).
 */
const clearReadNotifications = async (userId) => {
  await Notification.deleteMany({ recipient: userId, read: true });
  return { message: "Read notifications cleared" };
};

module.exports = {
  createLeaveRequestedNotif,
  createLeaveApprovedNotif,
  createLeaveRejectedNotif,
  createHolidayNotif,
  createOccasionNotif,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
};
