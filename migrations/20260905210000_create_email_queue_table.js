/**
 * Migration: create email_queue table
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("email_queue");
  if (!hasTable) {
    await knex.schema.createTable("email_queue", (table) => {
      table.increments("id").primary();
      table.string("recipient", 255).notNullable();
      table.string("template_slug", 100).nullable();
      table.string("email_type", 50).notNullable().defaultTo("general");
      table.string("subject", 500).nullable();
      table.text("body_html").nullable();
      table.text("body_text").nullable();
      table.jsonb("variables").nullable();
      table
        .integer("user_id")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table.jsonb("metadata").nullable();
      table.string("status", 25).notNullable().defaultTo("pending"); // pending, processing, completed, failed
      table.integer("attempts").notNullable().defaultTo(0);
      table.integer("max_attempts").notNullable().defaultTo(3);
      table.text("last_error").nullable();
      table.timestamp("next_attempt_at").defaultTo(knex.fn.now());
      table.timestamp("processed_at").nullable();
      table.timestamps(true, true);

      // Indexes for high-performance background queue polling
      table.index(["status", "next_attempt_at"]);
      table.index(["status"]);
      table.index(["recipient"]);
      table.index(["email_type"]);
      table.index(["created_at"]);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("email_queue");
};
