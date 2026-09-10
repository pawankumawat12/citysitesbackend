const notificationModel = require("../../models/notification.model");

async function listNotifications(req, res) {
  try {
    const user = req.user;
    const role = user.role === "admin" ? "admin" : "customer";
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await notificationModel.getNotifications({
      userId: user.id,
      role,
      page,
      limit,
    });

    const unreadCount = await notificationModel.getUnreadNotificationCount({
      userId: user.id,
      role,
    });

    return res.status(200).json({
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount,
      },
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error listing notifications:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
}

async function getUnreadCount(req, res) {
  try {
    const user = req.user;
    const role = user.role === "admin" ? "admin" : "customer";

    const count = await notificationModel.getUnreadNotificationCount({
      userId: user.id,
      role,
    });

    return res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
}

async function markRead(req, res) {
  try {
    const { id } = req.params;
    const updated = await notificationModel.markNotificationAsRead(id);

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ success: false, message: "Failed to mark notification read" });
  }
}

async function markAllRead(req, res) {
  try {
    const user = req.user;
    const role = user.role === "admin" ? "admin" : "customer";

    await notificationModel.markAllNotificationsAsRead({
      userId: user.id,
      role,
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    return res.status(500).json({ success: false, message: "Failed to mark notifications read" });
  }
}

async function registerAdminDeviceToken(req, res) {
  try {
    const user = req.user;
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { token, deviceType, deviceInfo } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const fcmService = require("../../services/fcmNotification.service");
    const result = await fcmService.registerAdminToken({
      userId: user.id,
      token,
      deviceType: deviceType || "web",
      deviceInfo: deviceInfo || req.headers["user-agent"] || null,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error registering admin device token:", error);
    return res.status(500).json({ success: false, message: "Failed to register token" });
  }
}

async function unregisterAdminDeviceToken(req, res) {
  try {
    const user = req.user;
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const fcmService = require("../../services/fcmNotification.service");
    const result = await fcmService.unregisterAdminToken({ token });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error unregistering admin device token:", error);
    return res.status(500).json({ success: false, message: "Failed to unregister token" });
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  registerAdminDeviceToken,
  unregisterAdminDeviceToken,
};
