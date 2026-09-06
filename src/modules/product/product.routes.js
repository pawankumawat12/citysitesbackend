const express = require("express");
const { verifyToken, isAdmin } = require("../../../middleware/auth.middleware");
const {
  listProducts,
  getProductById,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  bulkUpdateProductStatusHandler,
  bulkDeleteProductsHandler,
  exportProductsHandler,
} = require("./product.controller");
const { uploadImage } = require("../../../middleware/upload");

const router = express.Router();

// Bulk actions and export (Admin)
router.get("/export", verifyToken, isAdmin, exportProductsHandler);
router.post("/bulk-status", verifyToken, isAdmin, bulkUpdateProductStatusHandler);
router.post("/bulk-delete", verifyToken, isAdmin, bulkDeleteProductsHandler);

// Storefront menu and product details are public read-only resources.
router.get("/", listProducts);
router.get("/:id", getProductById);
router.post("/", verifyToken, isAdmin, uploadImage.array("images", 5), createProductHandler);
router.put("/:id", verifyToken, isAdmin, uploadImage.array("images", 5), updateProductHandler);
router.delete("/:id", verifyToken, isAdmin, deleteProductHandler);

module.exports = router;
