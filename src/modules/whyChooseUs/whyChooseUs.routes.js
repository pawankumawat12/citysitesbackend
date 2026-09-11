const express = require("express");
const { verifyToken, isAdmin } = require("../../../middleware/auth.middleware");
const { uploadImage } = require("../../../middleware/upload");
const {
  getActiveWhyChooseUs,
  getAdminWhyChooseUs,
  getItemByIdHandler,
  createItemHandler,
  updateItemHandler,
  toggleItemStatusHandler,
  reorderItemsHandler,
  deleteItemHandler,
  getSectionSettingsHandler,
  updateSectionSettingsHandler,
} = require("./whyChooseUs.controller");

const router = express.Router();

// Public route: Get all active items + section settings for frontend
router.get("/", getActiveWhyChooseUs);

// Admin routes
router.get("/admin", verifyToken, isAdmin, getAdminWhyChooseUs);
router.get("/settings", getSectionSettingsHandler);
router.put("/settings", verifyToken, isAdmin, updateSectionSettingsHandler);
router.patch("/reorder", verifyToken, isAdmin, reorderItemsHandler);
router.get("/:id", verifyToken, isAdmin, getItemByIdHandler);
router.post("/", verifyToken, isAdmin, uploadImage.single("image"), createItemHandler);
router.put("/:id", verifyToken, isAdmin, uploadImage.single("image"), updateItemHandler);
router.patch("/:id/status", verifyToken, isAdmin, toggleItemStatusHandler);
router.delete("/:id", verifyToken, isAdmin, deleteItemHandler);

module.exports = router;
