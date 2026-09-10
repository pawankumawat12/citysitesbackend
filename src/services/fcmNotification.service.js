const db = require("../../config/db");

let admin = null;
let isInitialized = false;
let initErrorLogged = false;

/**
 * Safely initialize and return the Firebase Admin instance.
 * Supports:
 *  1. FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string in .env)
 *  2. FIREBASE_SERVICE_ACCOUNT_PATH (file path to JSON key)
 *  3. Individual env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *  4. GOOGLE_APPLICATION_CREDENTIALS / default credentials
 * If not configured, gracefully returns null and logs diagnostic warning without crashing.
 */
function getFirebaseAdmin() {
  if (isInitialized) return admin;

  try {
    const firebaseAdmin = require("firebase-admin");

    if (firebaseAdmin.apps.length > 0) {
      admin = firebaseAdmin;
      isInitialized = true;
      return admin;
    }

    // 1. Try FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
        });
        admin = firebaseAdmin;
        isInitialized = true;
        console.log("[FCM Service] Initialized successfully with FIREBASE_SERVICE_ACCOUNT_JSON.");
        return admin;
      } catch (jsonErr) {
        console.error("[FCM Service] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", jsonErr.message);
      }
    }

    // 2. Try FIREBASE_SERVICE_ACCOUNT_PATH (file path)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      try {
        const path = require("path");
        const resolvedPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        const serviceAccount = require(resolvedPath);
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
        });
        admin = firebaseAdmin;
        isInitialized = true;
        console.log("[FCM Service] Initialized successfully with FIREBASE_SERVICE_ACCOUNT_PATH.");
        return admin;
      } catch (pathErr) {
        console.error("[FCM Service] Failed to load service account file:", pathErr.message);
      }
    }

    // 3. Try individual env vars
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        privateKey = privateKey.replace(/\\n/g, "\n");
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        admin = firebaseAdmin;
        isInitialized = true;
        console.log("[FCM Service] Initialized successfully with individual environment credentials.");
        return admin;
      } catch (certErr) {
        console.error("[FCM Service] Failed to initialize with individual cert credentials:", certErr.message);
      }
    }

    // 4. Try GOOGLE_APPLICATION_CREDENTIALS / default
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        firebaseAdmin.initializeApp();
        admin = firebaseAdmin;
        isInitialized = true;
        console.log("[FCM Service] Initialized with GOOGLE_APPLICATION_CREDENTIALS.");
        return admin;
      } catch (adcErr) {
        console.error("[FCM Service] Failed to initialize with ADC:", adcErr.message);
      }
    }

    if (!initErrorLogged) {
      initErrorLogged = true;
      console.warn(
        "[FCM Service] Firebase Admin credentials not yet configured in .env. Push notifications will be safely skipped until credentials are provided."
      );
    }
  } catch (err) {
    if (!initErrorLogged) {
      initErrorLogged = true;
      console.warn("[FCM Service] firebase-admin package is not initialized:", err.message);
    }
  }

  return null;
}

let tableChecked = false;
async function ensureTokensTableExists() {
  if (tableChecked) return;
  try {
    const exists = await db.schema.hasTable("admin_device_tokens");
    if (!exists) {
      await db.schema.createTable("admin_device_tokens", (table) => {
        table.increments("id").primary();
        table
          .integer("user_id")
          .unsigned()
          .references("id")
          .inTable("users")
          .onDelete("CASCADE");
        table.string("role", 50).defaultTo("admin").index();
        table.text("token").notNullable().unique().index();
        table.string("device_type", 50).defaultTo("web");
        table.text("device_info").nullable();
        table.boolean("is_active").defaultTo(true).index();
        table.timestamp("last_used_at").nullable();
        table.timestamps(true, true);
      });
      console.log("[FCM Service] Created admin_device_tokens table automatically.");
    }
    tableChecked = true;
  } catch {
    tableChecked = true;
  }
}

/**
 * Register or update an admin FCM device token.
 * Supports multiple devices per admin.
 */
async function registerAdminToken({
  userId = null,
  token,
  deviceType = "web",
  deviceInfo = null,
}) {
  if (!token || typeof token !== "string" || !token.trim()) {
    return { success: false, message: "FCM token is required" };
  }

  const cleanToken = token.trim();

  try {
    await ensureTokensTableExists();
    const existing = await db("admin_device_tokens")
      .where({ token: cleanToken })
      .first();

    if (existing) {
      await db("admin_device_tokens")
        .where({ id: existing.id })
        .update({
          user_id: userId ? Number(userId) : existing.user_id,
          role: "admin",
          device_type: deviceType || existing.device_type,
          device_info: deviceInfo || existing.device_info,
          is_active: true,
          last_used_at: new Date(),
          updated_at: new Date(),
        });
      return { success: true, message: "Token updated successfully", id: existing.id };
    }

    const [created] = await db("admin_device_tokens")
      .insert({
        user_id: userId ? Number(userId) : null,
        role: "admin",
        token: cleanToken,
        device_type: deviceType,
        device_info: deviceInfo,
        is_active: true,
        last_used_at: new Date(),
      })
      .returning("*");

    return { success: true, message: "Token registered successfully", id: created?.id };
  } catch (err) {
    console.error("[FCM Service] Error registering admin token:", err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Deactivate an admin token upon logout or permission revoke.
 */
async function unregisterAdminToken({ token }) {
  if (!token) return { success: false, message: "Token required" };
  try {
    await db("admin_device_tokens")
      .where({ token: token.trim() })
      .update({
        is_active: false,
        updated_at: new Date(),
      });
    return { success: true, message: "Token deactivated" };
  } catch (err) {
    console.error("[FCM Service] Error unregistering token:", err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Send push notification to all active admin devices for a newly placed order.
 * Strictly guarantees: FCM failure will NEVER fail or rollback the caller.
 */
async function sendAdminNewOrderNotification({
  orderId,
  orderNumber,
  totalAmount,
  customerName,
}) {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      console.log("[FCM Service] Skipping push: Firebase Admin credentials not active.");
      return { success: false, reason: "NOT_CONFIGURED" };
    }

    // 1. Fetch all active admin tokens
    await ensureTokensTableExists();
    const activeRows = await db("admin_device_tokens")
      .where({ role: "admin", is_active: true })
      .select("id", "token");

    if (!activeRows || activeRows.length === 0) {
      console.log("[FCM Service] No active admin device tokens found in database.");
      return { success: true, count: 0 };
    }

    const tokens = activeRows.map((r) => r.token);
    const orderNumStr = String(orderNumber || orderId);
    const orderIdStr = String(orderId);

    // 2. Build multicast message payload
    const messagePayload = {
      tokens,
      notification: {
        title: "SFC Cafe",
        body: `New order received - Order #${orderNumStr}`,
      },
      data: {
        orderId: orderIdStr,
        orderNumber: orderNumStr,
        type: "new_order",
        url: "/orders",
        click_action: "/orders",
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title: "SFC Cafe",
          body: `New order received - Order #${orderNumStr}`,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          tag: `order-${orderIdStr}`,
          renotify: true,
          requireInteraction: true,
          data: {
            orderId: orderIdStr,
            orderNumber: orderNumStr,
            url: "/orders",
          },
        },
        fcmOptions: {
          link: "/orders",
        },
      },
    };

    const response = await firebaseApp.messaging().sendEachForMulticast(messagePayload);
    console.log(
      `[FCM Service] Multicast result: ${response.successCount} succeeded, ${response.failureCount} failed.`
    );

    // 3. Deactivate any invalid/expired tokens automatically
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code || "";
          const errorMsg = resp.error?.message || "";
          console.warn(
            `[FCM Service] Failed to send to token ${tokens[idx].substring(0, 12)}... Code: ${errorCode}, Msg: ${errorMsg}`
          );

          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/invalid-argument"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        console.log(`[FCM Service] Deactivating ${invalidTokens.length} invalid/expired tokens.`);
        await db("admin_device_tokens")
          .whereIn("token", invalidTokens)
          .update({ is_active: false, updated_at: new Date() })
          .catch((dbErr) =>
            console.error("[FCM Service] Failed to deactivate invalid tokens:", dbErr.message)
          );
      }
    }

    return {
      success: true,
      sentCount: response.successCount,
      failedCount: response.failureCount,
    };
  } catch (error) {
    console.error("[FCM Service] Error sending new order push notification:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getFirebaseAdmin,
  registerAdminToken,
  unregisterAdminToken,
  sendAdminNewOrderNotification,
};
