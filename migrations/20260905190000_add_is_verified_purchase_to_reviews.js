/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasCol = await knex.schema.hasColumn("reviews", "is_verified_purchase");
  if (!hasCol) {
    await knex.schema.alterTable("reviews", (table) => {
      table.boolean("is_verified_purchase").defaultTo(false);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn("reviews", "is_verified_purchase");
  if (hasCol) {
    await knex.schema.alterTable("reviews", (table) => {
      table.dropColumn("is_verified_purchase");
    });
  }
};

