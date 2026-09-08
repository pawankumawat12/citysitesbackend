const express = require("express");
const { verifyToken, isAdmin } = require("../../../middleware/auth.middleware");
const {
  getPublicPagesHandler,
  getPageBySlugHandler,
  getAdminPagesHandler,
  getAdminPageByIdHandler,
  createAdminPageHandler,
  updateAdminPageHandler,
  deleteAdminPageHandler,
  bulkStatusAdminPagesHandler,
  bulkDeleteAdminPagesHandler,
} = require("./cmsPage.controller");

const router = express.Router();

// Public routes for customer storefront
router.get("/pages", getPublicPagesHandler);
router.get("/pages/:slug", getPageBySlugHandler);

// Admin routes (requires authentication & admin privileges)
router.get("/admin/pages", verifyToken, isAdmin, getAdminPagesHandler);
router.get("/admin/pages/:id", verifyToken, isAdmin, getAdminPageByIdHandler);
router.post("/admin/pages", verifyToken, isAdmin, createAdminPageHandler);
router.put("/admin/pages/:id", verifyToken, isAdmin, updateAdminPageHandler);
router.delete("/admin/pages/:id", verifyToken, isAdmin, deleteAdminPageHandler);
router.post("/admin/pages/bulk-status", verifyToken, isAdmin, bulkStatusAdminPagesHandler);
router.post("/admin/pages/bulk-delete", verifyToken, isAdmin, bulkDeleteAdminPagesHandler);

module.exports = router;

