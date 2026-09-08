/**
 * Migration: Add delivered_at to orders table and cloudinary_public_id to order_messages table.
 * Also backfills delivered_at for already delivered/completed orders and cloudinary_public_id from storage_key.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Add delivered_at column to orders table
  if (await knex.schema.hasTable("orders")) {
    const hasDeliveredAt = await knex.schema.hasColumn("orders", "delivered_at");
    if (!hasDeliveredAt) {
      await knex.schema.alterTable("orders", (table) => {
        table.timestamp("delivered_at", { useTz: true }).nullable().index();
      });

      // Backfill delivered_at for orders already in Delivered or Completed state
      await knex("orders")
        .whereIn("status", ["Delivered", "Completed"])
        .whereNull("delivered_at")
        .update({
          delivered_at: knex.raw("COALESCE(updated_at, created_at, NOW())"),
        });
    }
  }

  // 2. Add cloudinary_public_id column to order_messages table
  if (await knex.schema.hasTable("order_messages")) {
    const hasCloudinaryId = await knex.schema.hasColumn(
      "order_messages",
      "cloudinary_public_id"
    );
    if (!hasCloudinaryId) {
      await knex.schema.alterTable("order_messages", (table) => {
        table.string("cloudinary_public_id", 255).nullable().index();
      });

      // Backfill from storage_key where available
      await knex("order_messages")
        .whereNotNull("storage_key")
        .whereNull("cloudinary_public_id")
        .update({
          cloudinary_public_id: knex.ref("storage_key"),
        });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  if (await knex.schema.hasTable("orders")) {
    const hasDeliveredAt = await knex.schema.hasColumn("orders", "delivered_at");
    if (hasDeliveredAt) {
      await knex.schema.alterTable("orders", (table) => {
        table.dropColumn("delivered_at");
      });
    }
  }

  if (await knex.schema.hasTable("order_messages")) {
    const hasCloudinaryId = await knex.schema.hasColumn(
      "order_messages",
      "cloudinary_public_id"
    );
    if (hasCloudinaryId) {
      await knex.schema.alterTable("order_messages", (table) => {
        table.dropColumn("cloudinary_public_id");
      });
    }
  }
};

