const cmsPageModel = require("../../models/cmsPage.model");
const {
  validateCmsPageCreate,
  validateCmsPageUpdate,
  normalizeSlug,
} = require("./cmsPage.validation");
const db = require("../../../config/db");

// 1. Public - Get all published pages for footer / navigation
async function getPublicPagesHandler(req, res) {
  try {
    const pages = await cmsPageModel.getPublicNavPages();
    return res.status(200).json({
      success: true,
      data: pages,
    });
  } catch (error) {
    console.error("getPublicPagesHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pages",
    });
  }
}

// 2. Public - Get page by slug
async function getPageBySlugHandler(req, res) {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }

    const page = await cmsPageModel.getCmsPageBySlug(slug, {
      onlyActive: true,
      onlyPublished: true,
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found or is currently unavailable",
      });
    }

    return res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    console.error("getPageBySlugHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load page content",
    });
  }
}

// 3. Admin - List pages with pagination & search
async function getAdminPagesHandler(req, res) {
  try {
    const { page, limit, search, status, isActive, sortBy, sortOrder } = req.query;
    const result = await cmsPageModel.listCmsPages({
      page,
      limit,
      search,
      status,
      isActive,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      data: result.pages,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("getAdminPagesHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve CMS pages",
    });
  }
}

// 4. Admin - Get single page by ID
async function getAdminPageByIdHandler(req, res) {
  try {
    const { id } = req.params;
    const page = await cmsPageModel.getCmsPageById(id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "CMS page not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    console.error("getAdminPageByIdHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch CMS page",
    });
  }
}

// 5. Admin - Create new CMS page
async function createAdminPageHandler(req, res) {
  try {
    const validation = validateCmsPageCreate(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0] || "Validation failed",
        errors: validation.errors,
      });
    }

    // Check slug collision
    const existing = await db("cms_pages")
      .where("slug", validation.data.slug)
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A page with slug '${validation.data.slug}' already exists`,
        errors: { slug: `A page with slug '${validation.data.slug}' already exists` },
      });
    }

    const created = await cmsPageModel.createCmsPage(validation.data);

    return res.status(201).json({
      success: true,
      message: "CMS page created successfully",
      data: created,
    });
  } catch (error) {
    console.error("createAdminPageHandler error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create CMS page",
    });
  }
}

// 6. Admin - Update CMS page
async function updateAdminPageHandler(req, res) {
  try {
    const { id } = req.params;
    const existing = await cmsPageModel.getCmsPageById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "CMS page not found",
      });
    }

    const validation = validateCmsPageUpdate(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: Object.values(validation.errors)[0] || "Validation failed",
        errors: validation.errors,
      });
    }

    // Check slug collision if slug is being updated
    if (validation.data.slug && validation.data.slug !== existing.slug) {
      const conflict = await db("cms_pages")
        .where("slug", validation.data.slug)
        .whereNot("id", Number(id))
        .first();

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `A page with slug '${validation.data.slug}' already exists`,
          errors: { slug: `A page with slug '${validation.data.slug}' already exists` },
        });
      }
    }

    const updated = await cmsPageModel.updateCmsPage(id, validation.data);

    return res.status(200).json({
      success: true,
      message: "CMS page updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("updateAdminPageHandler error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update CMS page",
    });
  }
}

// 7. Admin - Delete CMS page
async function deleteAdminPageHandler(req, res) {
  try {
    const { id } = req.params;
    const existing = await cmsPageModel.getCmsPageById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "CMS page not found",
      });
    }

    await cmsPageModel.deleteCmsPage(id);

    return res.status(200).json({
      success: true,
      message: "CMS page deleted successfully",
    });
  } catch (error) {
    console.error("deleteAdminPageHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete CMS page",
    });
  }
}

// 8. Admin - Bulk status / active toggle
async function bulkStatusAdminPagesHandler(req, res) {
  try {
    const { ids, status, isActive } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No page IDs provided for bulk status update",
      });
    }

    const updatedCount = await cmsPageModel.bulkUpdateStatus(ids, { status, isActive });

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedCount} page(s)`,
      updatedCount,
    });
  } catch (error) {
    console.error("bulkStatusAdminPagesHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk update CMS pages",
    });
  }
}

// 9. Admin - Bulk delete
async function bulkDeleteAdminPagesHandler(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No page IDs provided for bulk deletion",
      });
    }

    const deletedCount = await cmsPageModel.bulkDeleteCmsPages(ids);

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} page(s)`,
      deletedCount,
    });
  } catch (error) {
    console.error("bulkDeleteAdminPagesHandler error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to bulk delete CMS pages",
    });
  }
}

module.exports = {
  getPublicPagesHandler,
  getPageBySlugHandler,
  getAdminPagesHandler,
  getAdminPageByIdHandler,
  createAdminPageHandler,
  updateAdminPageHandler,
  deleteAdminPageHandler,
  bulkStatusAdminPagesHandler,
  bulkDeleteAdminPagesHandler,
};

