exports.up = async function (knex) {
  // 1. Create why_choose_us table
  const hasWhyTable = await knex.schema.hasTable("why_choose_us");
  if (!hasWhyTable) {
    await knex.schema.createTable("why_choose_us", (table) => {
      table.increments("id").primary();
      table.string("title", 255).notNullable();
      table.text("description").notNullable();
      table.string("icon", 100).notNullable().defaultTo("Leaf");
      table.string("image", 1000).nullable();
      table.string("storage_key", 500).nullable();
      table.string("color_class", 255).nullable().defaultTo("bg-[var(--color-primary-50)] text-[var(--color-primary)]");
      table.integer("display_order").notNullable().defaultTo(1);
      table.boolean("is_active").notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.index(["display_order"]);
      table.index(["is_active"]);
    });

    // Seed default 4 items
    await knex("why_choose_us").insert([
      {
        title: "Fresh Ingredients",
        description: "We use fresh and carefully selected ingredients to make every meal delicious.",
        icon: "Leaf",
        color_class: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
        display_order: 1,
        is_active: true,
      },
      {
        title: "Made Fresh & Fast",
        description: "Your food is prepared fresh when you order, without compromising on taste.",
        icon: "Zap",
        color_class: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]",
        display_order: 2,
        is_active: true,
      },
      {
        title: "Quick Delivery",
        description: "Hot and fresh food delivered quickly and safely right to your doorstep.",
        icon: "Truck",
        color_class: "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
        display_order: 3,
        is_active: true,
      },
      {
        title: "Made With Love",
        description: "Every dish is prepared with care because great food should feel special.",
        icon: "Heart",
        color_class: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]",
        display_order: 4,
        is_active: true,
      },
    ]);
  }

  // 2. Create customer_testimonials table
  const hasTestimonialsTable = await knex.schema.hasTable("customer_testimonials");
  if (!hasTestimonialsTable) {
    await knex.schema.createTable("customer_testimonials", (table) => {
      table.increments("id").primary();
      table.string("name", 255).notNullable();
      table.string("location", 255).nullable().defaultTo("Jaipur");
      table.smallint("rating").notNullable().defaultTo(5);
      table.text("review").notNullable();
      table.string("avatar", 1000).nullable();
      table.string("storage_key", 500).nullable();
      table.string("date_text", 100).nullable().defaultTo("Recent");
      table.integer("display_order").notNullable().defaultTo(1);
      table.boolean("is_active").notNullable().defaultTo(true);
      table.timestamps(true, true);

      table.index(["display_order"]);
      table.index(["is_active"]);
    });

    // Seed default 4 testimonials
    await knex("customer_testimonials").insert([
      {
        name: "Rahul Sharma",
        location: "Jaipur",
        rating: 5,
        review: "Absolutely loved the burger! Everything tasted fresh and the fries were perfectly crispy. Will definitely order again.",
        date_text: "2 days ago",
        display_order: 1,
        is_active: true,
      },
      {
        name: "Priya Mehta",
        location: "Jaipur",
        rating: 5,
        review: "The food was amazing and delivery was really quick. The packaging was also neat and everything arrived hot.",
        date_text: "5 days ago",
        display_order: 2,
        is_active: true,
      },
      {
        name: "Amit Verma",
        location: "Jaipur",
        rating: 4,
        review: "Great taste and good portion size. The pizza was delicious and the overall experience was really good.",
        date_text: "1 week ago",
        display_order: 3,
        is_active: true,
      },
      {
        name: "Neha Gupta",
        location: "Jaipur",
        rating: 5,
        review: "One of my favorite places for quick food. Fresh ingredients, tasty food and friendly service.",
        date_text: "1 week ago",
        display_order: 4,
        is_active: true,
      },
    ]);
  }

  // 3. Seed default section headers in settings table if settings exists
  const hasSettings = await knex.schema.hasTable("settings");
  if (hasSettings) {
    const existingWhy = await knex("settings").where({ key: "why_choose_us_section" }).first();
    if (!existingWhy) {
      await knex("settings").insert({
        key: "why_choose_us_section",
        value: JSON.stringify({
          badge: "Why Choose Us",
          title: "More Than Just",
          highlight: "Fast Food",
          subtitle: "We believe great food starts with great ingredients, careful preparation and a whole lot of love.",
          cta_text: "Taste The Difference",
          cta_href: "/menu",
        }),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    const existingTestimonial = await knex("settings").where({ key: "customer_reviews_section" }).first();
    if (!existingTestimonial) {
      await knex("settings").insert({
        key: "customer_reviews_section",
        value: JSON.stringify({
          badge: "Customer Love",
          title: "What Our Customers Say",
          subtitle: "Real feedback from genuine food lovers who order from us regularly.",
        }),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("why_choose_us");
  await knex.schema.dropTableIfExists("customer_testimonials");
  const hasSettings = await knex.schema.hasTable("settings");
  if (hasSettings) {
    await knex("settings").whereIn("key", ["why_choose_us_section", "customer_reviews_section"]).del();
  }
};
