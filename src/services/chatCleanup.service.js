const orderMessageModel = require("../models/orderMessage.model");
const {
  deleteFile,
  extractPublicIdFromUrl,
} = require("./storage/cloudinary.storage");

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

let cleanupIntervalTimer = null;
let isCleanupRunning = false;

/**
 * Common chat cleanup function:
 * 1. Finds chat messages older than 2 days using created_at.
 * 2. Purges any Cloudinary attachments using cloudinary_public_id / storage_key / attachment_url.
 * 3. Deletes the database message records.
 *
 * Can be invoked manually (via API/script) or automatically via scheduled cron.
 */
async function cleanupOldChatData() {
  if (isCleanupRunning) {
    console.log("[ChatCleanup] A cleanup job is already in progress, skipping run.");
    return {
      success: false,
      message: "Cleanup job already running",
      deletedCount: 0,
      attachmentsDeleted: 0,
    };
  }

  isCleanupRunning = true;
  const cutoffDate = new Date(Date.now() - TWO_DAYS_MS);
  const errors = [];
  let attachmentsDeleted = 0;
  let deletedCount = 0;

  try {
    console.log(
      `[ChatCleanup] Starting chat cleanup for messages older than ${cutoffDate.toISOString()}...`
    );

    const oldMessages = await orderMessageModel.findMessagesOlderThan(cutoffDate);

    if (!oldMessages || oldMessages.length === 0) {
      console.log("[ChatCleanup] No chat messages older than 2 days found.");
      return {
        success: true,
        message: "No expired chat messages to clean up",
        deletedCount: 0,
        attachmentsDeleted: 0,
        cutoffDate: cutoffDate.toISOString(),
      };
    }

    console.log(
      `[ChatCleanup] Found ${oldMessages.length} message(s) older than 2 days to purge.`
    );

    // 1. Delete attachments from Cloudinary
    for (const msg of oldMessages) {
      const publicId =
        msg.cloudinary_public_id ||
        msg.storage_key ||
        extractPublicIdFromUrl(msg.attachment_url);

      if (publicId) {
        const isImage =
          msg.attachment_type === "image" ||
          (msg.attachment_url &&
            /\.(jpe?g|png|webp|gif)$/i.test(msg.attachment_url));
        const primaryResourceType = isImage ? "image" : "raw";

        try {
          const deleteRes = await deleteFile(publicId, {
            resourceType: primaryResourceType,
          });

          // If raw failed or wasn't found, try image or vice versa
          if (!deleteRes.success && primaryResourceType === "raw") {
            const retryRes = await deleteFile(publicId, { resourceType: "image" });
            if (retryRes.success) {
              attachmentsDeleted++;
            } else {
              errors.push({
                messageId: msg.id,
                publicId,
                error: retryRes.message || "Failed to delete Cloudinary asset",
              });
            }
          } else if (deleteRes.success) {
            attachmentsDeleted++;
          } else {
            errors.push({
              messageId: msg.id,
              publicId,
              error: deleteRes.message || "Failed to delete Cloudinary asset",
            });
          }
        } catch (assetErr) {
          console.warn(
            `[ChatCleanup] Error deleting Cloudinary attachment for message ${msg.id}:`,
            assetErr.message
          );
          errors.push({
            messageId: msg.id,
            publicId,
            error: assetErr.message,
          });
        }
      }
    }

    // 2. Delete database records
    const messageIds = oldMessages.map((m) => m.id);
    deletedCount = await orderMessageModel.deleteMessagesByIds(messageIds);

    console.log(
      `[ChatCleanup] Purged ${deletedCount} chat message(s) and ${attachmentsDeleted} Cloudinary file(s).`
    );

    return {
      success: true,
      message: `Cleaned up ${deletedCount} messages and ${attachmentsDeleted} attachments.`,
      deletedCount,
      attachmentsDeleted,
      errors: errors.length > 0 ? errors : undefined,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[ChatCleanup] Unexpected error during chat cleanup:", err);
    return {
      success: false,
      message: err.message,
      deletedCount,
      attachmentsDeleted,
      errors: [err.message],
    };
  } finally {
    isCleanupRunning = false;
  }
}

/**
 * Start recurring cron job to run cleanupOldChatData every 1 hour.
 */
function startChatCleanupCron() {
  if (cleanupIntervalTimer) {
    console.log("[ChatCleanup] Cron is already running.");
    return;
  }

  console.log("[ChatCleanup] Scheduling chat cleanup cron worker (every 1 hour).");

  // Initial run 15 seconds after boot
  setTimeout(async () => {
    try {
      await cleanupOldChatData();
    } catch (err) {
      console.error("[ChatCleanup] Initial startup cleanup run error:", err.message);
    }
  }, 15000);

  // Hourly recurring run
  cleanupIntervalTimer = setInterval(async () => {
    try {
      await cleanupOldChatData();
    } catch (err) {
      console.error("[ChatCleanup] Hourly cron run error:", err.message);
    }
  }, ONE_HOUR_MS);

  if (cleanupIntervalTimer.unref) {
    cleanupIntervalTimer.unref();
  }
}

/**
 * Stop recurring cron job (for tests or graceful shutdown)
 */
function stopChatCleanupCron() {
  if (cleanupIntervalTimer) {
    clearInterval(cleanupIntervalTimer);
    cleanupIntervalTimer = null;
    console.log("[ChatCleanup] Cron stopped.");
  }
}

module.exports = {
  cleanupOldChatData,
  startChatCleanupCron,
  stopChatCleanupCron,
};

