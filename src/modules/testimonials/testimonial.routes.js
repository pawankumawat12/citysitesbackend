const express = require("express");
const { verifyToken, isAdmin } = require("../../../middleware/auth.middleware");
const { uploadImage } = require("../../../middleware/upload");
const {
  getActiveTestimonials,
  getAdminTestimonials,
  getTestimonialByIdHandler,
  createTestimonialHandler,
  updateTestimonialHandler,
  toggleTestimonialStatusHandler,
  reorderTestimonialsHandler,
  deleteTestimonialHandler,
  getSectionSettingsHandler,
  updateSectionSettingsHandler,
} = require("./testimonial.controller");

const router = express.Router();

// Public route: Get all active testimonials + section settings for frontend
router.get("/", getActiveTestimonials);

// Admin routes
router.get("/admin", verifyToken, isAdmin, getAdminTestimonials);
router.get("/settings", getSectionSettingsHandler);
router.put("/settings", verifyToken, isAdmin, updateSectionSettingsHandler);
router.patch("/reorder", verifyToken, isAdmin, reorderTestimonialsHandler);
router.get("/:id", verifyToken, isAdmin, getTestimonialByIdHandler);
router.post("/", verifyToken, isAdmin, uploadImage.single("avatar"), createTestimonialHandler);
router.put("/:id", verifyToken, isAdmin, uploadImage.single("avatar"), updateTestimonialHandler);
router.patch("/:id/status", verifyToken, isAdmin, toggleTestimonialStatusHandler);
router.delete("/:id", verifyToken, isAdmin, deleteTestimonialHandler);

module.exports = router;
