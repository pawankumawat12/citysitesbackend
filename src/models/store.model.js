const db = require("../../config/db");

/**
 * Find store by ID
 */
async function findStoreById(id) {
  return db("stores as s")
    .leftJoin("users as u", "s.created_by", "u.id")
    .select(
      "s.*",
      "u.name as owner_name",
      "u.email as owner_email",
      "u.phone as owner_phone",
      "u.role as owner_role"
    )
    .where("s.id", id)
    .first();
}

/**
 * Find store by slug
 */
async function findStoreBySlug(slug) {
  return db("stores as s")
    .leftJoin("users as u", "s.created_by", "u.id")
    .select(
      "s.*",
      "u.name as owner_name",
      "u.email as owner_email",
      "u.phone as owner_phone"
    )
    .where("s.slug", slug)
    .first();
}

/**
 * Find stores with filters, pagination and sorting
 */
async function findStores({
  page = 1,
  limit = 10,
  offset = 0,
  search = "",
  status = "",
  is_active = "",
  sortBy = "created_at",
  sortOrder = "desc",
}) {
  const query = db("stores as s")
    .leftJoin("users as u", "s.created_by", "u.id")
    .select(
      "s.*",
      "u.name as owner_name",
      "u.email as owner_email",
      "u.phone as owner_phone",
      "u.role as owner_role"
    );

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query.where((builder) => {
      builder
        .whereRaw("LOWER(s.name) LIKE ?", [term])
        .orWhereRaw("LOWER(s.slug) LIKE ?", [term])
        .orWhereRaw("LOWER(COALESCE(u.name, '')) LIKE ?", [term])
        .orWhereRaw("LOWER(COALESCE(u.email, '')) LIKE ?", [term]);
    });
  }

  if (status && status !== "all") {
    query.where("s.status", status.toUpperCase());
  }

  if (is_active !== "" && is_active !== undefined && is_active !== "all") {
    const activeBool = is_active === "true" || is_active === true || is_active === "1";
    query.where("s.is_active", activeBool);
  }

  const allowedSortColumns = {
    id: "s.id",
    name: "s.name",
    slug: "s.slug",
    delivery_radius_km: "s.delivery_radius_km",
    is_active: "s.is_active",
    status: "s.status",
    created_at: "s.created_at",
    updated_at: "s.updated_at",
  };

  const sortColumn = allowedSortColumns[sortBy] || "s.created_at";
  const direction = sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

  return query.orderBy(sortColumn, direction).limit(limit).offset(offset);
}

/**
 * Count stores matching filters
 */
async function countStores({ search = "", status = "", is_active = "" } = {}) {
  const query = db("stores as s").leftJoin("users as u", "s.created_by", "u.id");

  if (search) {
    const term = `%${search.toLowerCase()}%`;
    query.where((builder) => {
      builder
        .whereRaw("LOWER(s.name) LIKE ?", [term])
        .orWhereRaw("LOWER(s.slug) LIKE ?", [term])
        .orWhereRaw("LOWER(COALESCE(u.name, '')) LIKE ?", [term])
        .orWhereRaw("LOWER(COALESCE(u.email, '')) LIKE ?", [term]);
    });
  }

  if (status && status !== "all") {
    query.where("s.status", status.toUpperCase());
  }

  if (is_active !== "" && is_active !== undefined && is_active !== "all") {
    const activeBool = is_active === "true" || is_active === true || is_active === "1";
    query.where("s.is_active", activeBool);
  }

  const result = await query.count("s.id as count").first();
  return Number(result?.count || 0);
}

/**
 * Aggregate store stats
 */
async function getStoreStats() {
  const rows = await db("stores")
    .select(
      db.raw("COUNT(*)::int as total"),
      db.raw("COUNT(*) FILTER (WHERE status = 'APPROVED')::int as approved"),
      db.raw("COUNT(*) FILTER (WHERE status = 'PENDING')::int as pending"),
      db.raw("COUNT(*) FILTER (WHERE status = 'REJECTED')::int as rejected"),
      db.raw("COUNT(*) FILTER (WHERE is_active = true)::int as active"),
      db.raw("COUNT(*) FILTER (WHERE is_active = false)::int as inactive")
    )
    .first();

  return {
    total: Number(rows?.total || 0),
    approved: Number(rows?.approved || 0),
    pending: Number(rows?.pending || 0),
    rejected: Number(rows?.rejected || 0),
    active: Number(rows?.active || 0),
    inactive: Number(rows?.inactive || 0),
  };
}

/**
 * Create new store
 */
async function createStore(data) {
  const [newStore] = await db("stores")
    .insert({
      name: data.name,
      slug: data.slug,
      delivery_radius_km: data.delivery_radius_km ?? 10.0,
      is_active: data.is_active ?? true,
      status: data.status || "PENDING",
      created_by: data.created_by || null,
    })
    .returning("*");

  return newStore;
}

/**
 * Update store
 */
async function updateStore(id, data) {
  const updatePayload = {
    ...data,
    updated_at: db.fn.now(),
  };

  const [updated] = await db("stores")
    .where({ id })
    .update(updatePayload)
    .returning("*");

  return updated;
}

/**
 * Update store status
 */
async function updateStoreStatus(id, status) {
  const [updated] = await db("stores")
    .where({ id })
    .update({
      status: status.toUpperCase(),
      updated_at: db.fn.now(),
    })
    .returning("*");

  return updated;
}

/**
 * Toggle store active state
 */
async function toggleStoreActive(id, is_active) {
  const [updated] = await db("stores")
    .where({ id })
    .update({
      is_active: Boolean(is_active),
      updated_at: db.fn.now(),
    })
    .returning("*");

  return updated;
}

/**
 * Delete store safely (unlinks assigned users)
 */
async function deleteStore(id) {
  return db.transaction(async (trx) => {
    // Unlink users who have this store_id
    await trx("users").where({ store_id: id }).update({ store_id: null });

    // Delete store
    const deletedCount = await trx("stores").where({ id }).del();
    return deletedCount > 0;
  });
}

/**
 * Get users who can be assigned as store owners
 */
async function getEligibleStoreOwners() {
  return db("users")
    .select("id", "name", "email", "phone", "role", "store_id", "is_active")
    .whereIn("role", ["user", "storeowner", "admin"])
    .orderBy("name", "asc")
    .limit(100);
}

module.exports = {
  findStoreById,
  findStoreBySlug,
  findStores,
  countStores,
  getStoreStats,
  createStore,
  updateStore,
  updateStoreStatus,
  toggleStoreActive,
  deleteStore,
  getEligibleStoreOwners,
};

