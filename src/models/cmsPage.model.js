const db = require("../../config/db");

function normalizeCmsPage(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    content: row.content,
    status: row.status || "draft",
    isActive: Boolean(row.is_active),
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    seoKeywords: row.seo_keywords || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function listCmsPages({
  page = 1,
  limit = 10,
  search = "",
  status = "",
  isActive = null,
  sortBy = "created_at",
  sortOrder = "desc",
} = {}) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(limit) || 10));
  const offset = (currentPage - 1) * pageSize;

  let query = db("cms_pages");

  if (String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    query = query.where(function () {
      this.whereILike("title", term)
        .orWhereILike("slug", term)
        .orWhereILike("seo_title", term);
    });
  }

  if (status && (status === "published" || status === "draft")) {
    query = query.where("status", status);
  }

  if (isActive !== null && isActive !== undefined && isActive !== "") {
    query = query.where("is_active", Boolean(isActive === true || isActive === "true"));
  }

  const allowedSortFields = ["id", "title", "slug", "status", "is_active", "created_at", "updated_at"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
  const direction = String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

  const [{ count }] = await query.clone().clearSelect().count("id as count");
  const rows = await query.orderBy(sortField, direction).limit(pageSize).offset(offset);
  const total = Number(count || 0);

  return {
    pages: rows.map(normalizeCmsPage),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

async function getCmsPageById(id) {
  const row = await db("cms_pages").where("id", Number(id)).first();
  return normalizeCmsPage(row);
}

async function getCmsPageBySlug(slug, { onlyActive = true, onlyPublished = true } = {}) {
  const normalized = normalizeSlug(slug);
  let query = db("cms_pages").where("slug", normalized);

  if (onlyActive) {
    query = query.where("is_active", true);
  }
  if (onlyPublished) {
    query = query.where("status", "published");
  }

  const row = await query.first();
  return normalizeCmsPage(row);
}

async function getPublicNavPages() {
  const rows = await db("cms_pages")
    .select("id", "title", "slug")
    .where("is_active", true)
    .where("status", "published")
    .orderBy("id", "asc");

  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    slug: r.slug,
  }));
}

async function createCmsPage(data) {
  const title = String(data.title || "").trim();
  const slug = normalizeSlug(data.slug || title);
  const content = String(data.content || "");
  const status = data.status === "draft" ? "draft" : "published";
  const is_active = data.isActive !== undefined ? Boolean(data.isActive) : true;
  const seo_title = data.seoTitle ? String(data.seoTitle).trim() : null;
  const seo_description = data.seoDescription ? String(data.seoDescription).trim() : null;
  const seo_keywords = data.seoKeywords ? String(data.seoKeywords).trim() : null;

  const [inserted] = await db("cms_pages")
    .insert({
      title,
      slug,
      content,
      status,
      is_active,
      seo_title,
      seo_description,
      seo_keywords,
    })
    .returning("*");

  return normalizeCmsPage(inserted);
}

async function updateCmsPage(id, data) {
  const updatePayload = {
    updated_at: new Date(),
  };

  if (data.title !== undefined) updatePayload.title = String(data.title).trim();
  if (data.slug !== undefined) updatePayload.slug = normalizeSlug(data.slug);
  if (data.content !== undefined) updatePayload.content = String(data.content);
  if (data.status !== undefined) {
    updatePayload.status = data.status === "draft" ? "draft" : "published";
  }
  if (data.isActive !== undefined) updatePayload.is_active = Boolean(data.isActive);
  if (data.seoTitle !== undefined) {
    updatePayload.seo_title = data.seoTitle ? String(data.seoTitle).trim() : null;
  }
  if (data.seoDescription !== undefined) {
    updatePayload.seo_description = data.seoDescription ? String(data.seoDescription).trim() : null;
  }
  if (data.seoKeywords !== undefined) {
    updatePayload.seo_keywords = data.seoKeywords ? String(data.seoKeywords).trim() : null;
  }

  const [updated] = await db("cms_pages")
    .where("id", Number(id))
    .update(updatePayload)
    .returning("*");

  return normalizeCmsPage(updated);
}

async function deleteCmsPage(id) {
  const deletedCount = await db("cms_pages").where("id", Number(id)).delete();
  return deletedCount > 0;
}

async function bulkUpdateStatus(ids, { status, isActive }) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const numericIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (numericIds.length === 0) return 0;

  const payload = { updated_at: new Date() };
  if (status && (status === "published" || status === "draft")) {
    payload.status = status;
  }
  if (isActive !== undefined && isActive !== null) {
    payload.is_active = Boolean(isActive);
  }

  return await db("cms_pages").whereIn("id", numericIds).update(payload);
}

async function bulkDeleteCmsPages(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const numericIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (numericIds.length === 0) return 0;

  return await db("cms_pages").whereIn("id", numericIds).delete();
}

module.exports = {
  normalizeCmsPage,
  normalizeSlug,
  listCmsPages,
  getCmsPageById,
  getCmsPageBySlug,
  getPublicNavPages,
  createCmsPage,
  updateCmsPage,
  deleteCmsPage,
  bulkUpdateStatus,
  bulkDeleteCmsPages,
};

