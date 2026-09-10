/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable("admin_device_tokens");
  if (!exists) {
    await knex.schema.createTable("admin_device_tokens", (table) => {
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
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("admin_device_tokens");
};
