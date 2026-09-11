const db = require("../../config/db");

const WHY_CHOOSE_US_COLUMNS = [
  "id",
  "title",
  "description",
  "icon",
  "image",
  "storage_key",
  "color_class",
  "display_order",
  "is_active",
  "created_at",
  "updated_at",
];

function findActiveItems() {
  return db("why_choose_us")
    .select(WHY_CHOOSE_US_COLUMNS)
    .where({ is_active: true })
    .orderBy("display_order", "asc")
    .orderBy("created_at", "asc");
}

function findItems({
  page = 1,
  limit = 20,
  offset = 0,
  search,
  isActive,
  sortBy = "display_order",
  sortOrder = "asc",
} = {}) {
  let query = db("why_choose_us").select(WHY_CHOOSE_US_COLUMNS);

  if (isActive !== undefined && isActive !== "" && isActive !== "all") {
    const activeBool = isActive === true || isActive === "true" || isActive === "Active";
    query = query.where({ is_active: activeBool });
  }

  if (search) {
    query = query.where(function () {
      this.whereILike("title", `%${search}%`)
        .orWhereILike("description", `%${search}%`)
        .orWhereILike("icon", `%${search}%`);
    });
  }

  return query
    .orderBy(sortBy, sortOrder)
    .limit(limit)
    .offset(offset);
}

function countItems({ search, isActive } = {}) {
  let query = db("why_choose_us");

  if (isActive !== undefined && isActive !== "" && isActive !== "all") {
    const activeBool = isActive === true || isActive === "true" || isActive === "Active";
    query = query.where({ is_active: activeBool });
  }

  if (search) {
    query = query.where(function () {
      this.whereILike("title", `%${search}%`)
        .orWhereILike("description", `%${search}%`)
        .orWhereILike("icon", `%${search}%`);
    });
  }

  return query.count("id as count").first().then((res) => Number(res?.count || 0));
}

async function getItemStats() {
  const [totalRes, activeRes] = await Promise.all([
    db("why_choose_us").count("id as count").first(),
    db("why_choose_us").where({ is_active: true }).count("id as count").first(),
  ]);

  const total = Number(totalRes?.count || 0);
  const active = Number(activeRes?.count || 0);
  const inactive = total - active;

  return { total, active, inactive };
}

function findItemById(id) {
  return db("why_choose_us").where({ id }).first();
}

async function getMaxDisplayOrder() {
  const row = await db("why_choose_us").max("display_order as max_order").first();
  return Number(row?.max_order || 0);
}

function createItem(data) {
  return db("why_choose_us")
    .insert({ ...data, created_at: new Date(), updated_at: new Date() })
    .returning(WHY_CHOOSE_US_COLUMNS)
    .then((rows) => rows[0]);
}

function updateItem(id, data) {
  return db("why_choose_us")
    .where({ id })
    .update({ ...data, updated_at: new Date() })
    .returning(WHY_CHOOSE_US_COLUMNS)
    .then((rows) => rows[0]);
}

function deleteItem(id) {
  return db("why_choose_us").where({ id }).del();
}

async function reorderItems(orderedItems) {
  return db.transaction(async (trx) => {
    for (const item of orderedItems) {
      if (!item.id || item.display_order === undefined) continue;
      await trx("why_choose_us")
        .where({ id: item.id })
        .update({ display_order: item.display_order, updated_at: new Date() });
    }
  });
}

module.exports = {
  WHY_CHOOSE_US_COLUMNS,
  findActiveItems,
  findItems,
  countItems,
  getItemStats,
  findItemById,
  getMaxDisplayOrder,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
};
