/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("users", "otp_attempts");
  if (!hasColumn) {
    await knex.schema.alterTable("users", (table) => {
      table.integer("otp_attempts").defaultTo(0).notNullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("users", "otp_attempts");
  if (hasColumn) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("otp_attempts");
    });
  }
};

