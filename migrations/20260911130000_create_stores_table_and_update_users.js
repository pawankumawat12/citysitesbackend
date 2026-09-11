/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Create stores table for multi-store support
  const hasStoresTable = await knex.schema.hasTable("stores");
  if (!hasStoresTable) {
    await knex.schema.createTable("stores", (table) => {
      table.increments("id").primary();
      table.string("name", 255).notNullable();
      table.string("slug", 255).notNullable().unique();
      table.decimal("delivery_radius_km", 10, 2).notNullable().defaultTo(10.0);
      table.boolean("is_active").notNullable().defaultTo(true);
      table
        .enu("status", ["PENDING", "APPROVED", "REJECTED"])
        .notNullable()
        .defaultTo("PENDING");
      table
        .integer("created_by")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table.timestamps(true, true);

      table.index(["slug"]);
      table.index(["status"]);
      table.index(["is_active"]);
      table.index(["created_by"]);
    });

    // Seed default SFC Bakery store to keep existing bakery data & workflow intact
    const hasSfcStore = await knex("stores").where({ slug: "sfc-bakery" }).first();
    if (!hasSfcStore) {
      await knex("stores").insert({
        name: "SFC Bakery",
        slug: "sfc-bakery",
        delivery_radius_km: 10.0,
        is_active: true,
        status: "APPROVED",
      });
    }
  }

  // 2. Update users table with nullable store_id foreign key
  const hasStoreId = await knex.schema.hasColumn("users", "store_id");
  if (!hasStoreId) {
    await knex.schema.alterTable("users", (table) => {
      table
        .integer("store_id")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("stores")
        .onDelete("SET NULL");
      table.index(["store_id"]);
    });
  }

  // 3. Update users role constraint to support storeowner, deliverypartner, admin, and user
  const client = knex.client && knex.client.config ? knex.client.config.client : "pg";
  if (client === "pg" || client === "postgresql" || client === "postgres") {
    await knex.raw(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN (
              SELECT con.conname
              FROM pg_catalog.pg_constraint con
              JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
              WHERE rel.relname = 'users'
                AND con.contype = 'c'
                AND pg_get_constraintdef(con.oid) ILIKE '%role%'
          ) LOOP
              EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
          END LOOP;
      END $$;
    `);

    await knex.raw(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('user', 'admin', 'storeowner', 'deliverypartner'));
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // 1. Remove store_id column from users table first to remove FK dependency
  const hasStoreId = await knex.schema.hasColumn("users", "store_id");
  if (hasStoreId) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("store_id");
    });
  }

  // 2. Revert role check constraint back to ('user', 'admin')
  const client = knex.client && knex.client.config ? knex.client.config.client : "pg";
  if (client === "pg" || client === "postgresql" || client === "postgres") {
    // Reassign any non-conforming roles to 'user' before enforcing stricter constraint
    await knex.raw(`
      UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'admin');
    `);

    await knex.raw(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN (
              SELECT con.conname
              FROM pg_catalog.pg_constraint con
              JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
              WHERE rel.relname = 'users'
                AND con.contype = 'c'
                AND pg_get_constraintdef(con.oid) ILIKE '%role%'
          ) LOOP
              EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
          END LOOP;
      END $$;
    `);

    await knex.raw(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('user', 'admin'));
    `);
  }

  // 3. Drop stores table
  await knex.schema.dropTableIfExists("stores");
};

