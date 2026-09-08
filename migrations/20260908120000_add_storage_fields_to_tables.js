/**
 * Migration: Add storage_key and storage_provider columns to support
 * provider-independent storage (Cloudinary, AWS S3, etc.)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Categories
  if (await knex.schema.hasTable("categories")) {
    const hasKey = await knex.schema.hasColumn("categories", "storage_key");
    if (!hasKey) {
      await knex.schema.alterTable("categories", (table) => {
        table.string("storage_key", 255).nullable();
        table.string("storage_provider", 50).nullable().defaultTo("cloudinary");
      });
    }
  }

  // 2. Hero Sliders
  if (await knex.schema.hasTable("hero_sliders")) {
    const hasKey = await knex.schema.hasColumn("hero_sliders", "storage_key");
    if (!hasKey) {
      await knex.schema.alterTable("hero_sliders", (table) => {
        table.string("storage_key", 255).nullable();
        table.string("storage_provider", 50).nullable().defaultTo("cloudinary");
      });
    }
  }

  // 3. Offers
  if (await knex.schema.hasTable("offers")) {
    const hasKey = await knex.schema.hasColumn("offers", "storage_key");
    if (!hasKey) {
      await knex.schema.alterTable("offers", (table) => {
        table.string("storage_key", 255).nullable();
        table.string("storage_provider", 50).nullable().defaultTo("cloudinary");
      });
    }
  }

  // 4. Users (Avatar storage)
  if (await knex.schema.hasTable("users")) {
    const hasKey = await knex.schema.hasColumn("users", "storage_key");
    if (!hasKey) {
      await knex.schema.alterTable("users", (table) => {
        table.string("storage_key", 255).nullable();
        table.string("storage_provider", 50).nullable().defaultTo("cloudinary");
      });
    }
  }

  // 5. Products (Multiple image keys & provider)
  if (await knex.schema.hasTable("products")) {
    const hasKeys = await knex.schema.hasColumn("products", "image_keys");
    if (!hasKeys) {
      await knex.schema.alterTable("products", (table) => {
        table.jsonb("image_keys").nullable().defaultTo("[]");
        table.string("storage_provider", 50).nullable().defaultTo("cloudinary");
      });
    }
  }

  // 6. Order Messages (Chat attachments)
  if (await knex.schema.hasTable("order_messages")) {
    const hasKey = await knex.schema.hasColumn("order_messages", "storage_key");
    if (!hasKey) {
      await knex.schema.alterTable("order_messages", (table) => {
        table.string("storage_key", 255).nullable();
        table.string("storage_provider", 50).nullable().defaultTo("cloudinary");
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  if (await knex.schema.hasTable("categories")) {
    await knex.schema.alterTable("categories", (table) => {
      table.dropColumn("storage_key");
      table.dropColumn("storage_provider");
    });
  }

  if (await knex.schema.hasTable("hero_sliders")) {
    await knex.schema.alterTable("hero_sliders", (table) => {
      table.dropColumn("storage_key");
      table.dropColumn("storage_provider");
    });
  }

  if (await knex.schema.hasTable("offers")) {
    await knex.schema.alterTable("offers", (table) => {
      table.dropColumn("storage_key");
      table.dropColumn("storage_provider");
    });
  }

  if (await knex.schema.hasTable("users")) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("storage_key");
      table.dropColumn("storage_provider");
    });
  }

  if (await knex.schema.hasTable("products")) {
    await knex.schema.alterTable("products", (table) => {
      table.dropColumn("image_keys");
      table.dropColumn("storage_provider");
    });
  }

  if (await knex.schema.hasTable("order_messages")) {
    await knex.schema.alterTable("order_messages", (table) => {
      table.dropColumn("storage_key");
      table.dropColumn("storage_provider");
    });
  }
};

