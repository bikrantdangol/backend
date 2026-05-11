const notificationService = require("../services/notificationService");

const getMyNotifications = async (req, res, next) => {
  try {
    const data = await notificationService.getUserNotifications(req.user._id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAsRead(
      req.params.id,
      req.user._id,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(
      req.params.id,
      req.user._id,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const clearReadNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.clearReadNotifications(
      req.user._id,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
};
