/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasGoogleId = await knex.schema.hasColumn("users", "google_id");
  if (!hasGoogleId) {
    await knex.schema.alterTable("users", (table) => {
      table.string("google_id", 255).nullable().unique();
    });
  }

  // Make password column nullable for social login users
  try {
    await knex.raw("ALTER TABLE users ALTER COLUMN password DROP NOT NULL;");
  } catch (err) {
    await knex.schema.alterTable("users", (table) => {
      table.string("password").nullable().alter();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasGoogleId = await knex.schema.hasColumn("users", "google_id");
  if (hasGoogleId) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("google_id");
    });
  }
};
