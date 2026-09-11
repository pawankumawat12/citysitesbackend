const db = require("../../config/db");

const TESTIMONIAL_COLUMNS = [
  "id",
  "name",
  "location",
  "rating",
  "review",
  "avatar",
  "storage_key",
  "date_text",
  "display_order",
  "is_active",
  "created_at",
  "updated_at",
];

function findActiveTestimonials() {
  return db("customer_testimonials")
    .select(TESTIMONIAL_COLUMNS)
    .where({ is_active: true })
    .orderBy("display_order", "asc")
    .orderBy("created_at", "asc");
}

function findTestimonials({
  page = 1,
  limit = 20,
  offset = 0,
  search,
  isActive,
  sortBy = "display_order",
  sortOrder = "asc",
} = {}) {
  let query = db("customer_testimonials").select(TESTIMONIAL_COLUMNS);

  if (isActive !== undefined && isActive !== "" && isActive !== "all") {
    const activeBool = isActive === true || isActive === "true" || isActive === "Active";
    query = query.where({ is_active: activeBool });
  }

  if (search) {
    query = query.where(function () {
      this.whereILike("name", `%${search}%`)
        .orWhereILike("location", `%${search}%`)
        .orWhereILike("review", `%${search}%`);
    });
  }

  return query
    .orderBy(sortBy, sortOrder)
    .limit(limit)
    .offset(offset);
}

function countTestimonials({ search, isActive } = {}) {
  let query = db("customer_testimonials");

  if (isActive !== undefined && isActive !== "" && isActive !== "all") {
    const activeBool = isActive === true || isActive === "true" || isActive === "Active";
    query = query.where({ is_active: activeBool });
  }

  if (search) {
    query = query.where(function () {
      this.whereILike("name", `%${search}%`)
        .orWhereILike("location", `%${search}%`)
        .orWhereILike("review", `%${search}%`);
    });
  }

  return query.count("id as count").first().then((res) => Number(res?.count || 0));
}

async function getTestimonialStats() {
  const [totalRes, activeRes, avgRes] = await Promise.all([
    db("customer_testimonials").count("id as count").first(),
    db("customer_testimonials").where({ is_active: true }).count("id as count").first(),
    db("customer_testimonials").avg("rating as avg_rating").first(),
  ]);

  const total = Number(totalRes?.count || 0);
  const active = Number(activeRes?.count || 0);
  const inactive = total - active;
  const avgRating = Number(avgRes?.avg_rating || 5).toFixed(1);

  return { total, active, inactive, avgRating };
}

function findTestimonialById(id) {
  return db("customer_testimonials").where({ id }).first();
}

async function getMaxDisplayOrder() {
  const row = await db("customer_testimonials").max("display_order as max_order").first();
  return Number(row?.max_order || 0);
}

function createTestimonial(data) {
  return db("customer_testimonials")
    .insert({ ...data, created_at: new Date(), updated_at: new Date() })
    .returning(TESTIMONIAL_COLUMNS)
    .then((rows) => rows[0]);
}

function updateTestimonial(id, data) {
  return db("customer_testimonials")
    .where({ id })
    .update({ ...data, updated_at: new Date() })
    .returning(TESTIMONIAL_COLUMNS)
    .then((rows) => rows[0]);
}

function deleteTestimonial(id) {
  return db("customer_testimonials").where({ id }).del();
}

async function reorderTestimonials(orderedItems) {
  return db.transaction(async (trx) => {
    for (const item of orderedItems) {
      if (!item.id || item.display_order === undefined) continue;
      await trx("customer_testimonials")
        .where({ id: item.id })
        .update({ display_order: item.display_order, updated_at: new Date() });
    }
  });
}

module.exports = {
  TESTIMONIAL_COLUMNS,
  findActiveTestimonials,
  findTestimonials,
  countTestimonials,
  getTestimonialStats,
  findTestimonialById,
  getMaxDisplayOrder,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  reorderTestimonials,
};
