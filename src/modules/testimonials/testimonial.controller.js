const {
  parsePagination,
  buildPaginationMeta,
} = require("../../../config/pagination");
const {
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
} = require("../../models/testimonial.model");
const { getSetting, setSetting } = require("../../models/settings.model");
const {
  uploadFile,
  deleteFile,
} = require("../../services/storage/storage.service");

function parseIdParam(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

const DEFAULT_SECTION_SETTINGS = {
  badge: "Customer Love",
  title: "What Our Customers Say",
  subtitle: "Real feedback from genuine food lovers who order from us regularly.",
};

// Public: Get active testimonials + section settings
async function getActiveTestimonials(req, res) {
  try {
    const [testimonials, sectionSettings] = await Promise.all([
      findActiveTestimonials(),
      getSetting("customer_reviews_section"),
    ]);

    return res.status(200).json({
      success: true,
      message: "Active customer testimonials fetched successfully",
      data: {
        testimonials,
        section: sectionSettings || DEFAULT_SECTION_SETTINGS,
      },
    });
  } catch (error) {
    console.error("Get active testimonials error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Get all testimonials with pagination, filter, and stats
async function getAdminTestimonials(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.search ? req.query.search.trim() : undefined;
    const isActive = req.query.status || req.query.isActive;
    const sortBy = req.query.sortBy || "display_order";
    const sortOrder = req.query.sortOrder || "asc";

    const [testimonials, total, stats, sectionSettings] = await Promise.all([
      findTestimonials({ page, limit, offset, search, isActive, sortBy, sortOrder }),
      countTestimonials({ search, isActive }),
      getTestimonialStats(),
      getSetting("customer_reviews_section"),
    ]);

    return res.status(200).json({
      success: true,
      message: "Customer testimonials fetched successfully",
      data: {
        testimonials,
        pagination: buildPaginationMeta(page, limit, total),
        stats,
        section: sectionSettings || DEFAULT_SECTION_SETTINGS,
      },
    });
  } catch (error) {
    console.error("Get admin testimonials error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Get by ID
async function getTestimonialByIdHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const testimonial = await findTestimonialById(id);
    if (!testimonial) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    return res.status(200).json({ success: true, data: testimonial });
  } catch (error) {
    console.error("Get testimonial by ID error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Create testimonial
async function createTestimonialHandler(req, res) {
  try {
    const { name, location, rating, review, date_text, display_order, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }
    if (!review || !review.trim()) {
      return res.status(400).json({ success: false, message: "Review text is required" });
    }

    let avatarUrl = req.body.avatarUrl || null;
    let storageKey = null;

    if (req.file) {
      const uploadResult = await uploadFile(req.file, "testimonials");
      avatarUrl = uploadResult.url;
      storageKey = uploadResult.key || null;
    }

    const maxOrder = await getMaxDisplayOrder();
    const parsedOrder = display_order !== undefined ? Number(display_order) : maxOrder + 1;
    const activeBool = is_active === undefined ? true : is_active === true || is_active === "true";
    const parsedRating = Math.max(1, Math.min(5, Number(rating) || 5));

    const newTestimonial = await createTestimonial({
      name: name.trim(),
      location: location && location.trim() ? location.trim() : "Jaipur",
      rating: parsedRating,
      review: review.trim(),
      avatar: avatarUrl,
      storage_key: storageKey,
      date_text: date_text && date_text.trim() ? date_text.trim() : "Recent",
      display_order: isNaN(parsedOrder) ? 1 : parsedOrder,
      is_active: activeBool,
    });

    return res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      data: newTestimonial,
    });
  } catch (error) {
    console.error("Create testimonial error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Update testimonial
async function updateTestimonialHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const existing = await findTestimonialById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    const { name, location, rating, review, date_text, display_order, is_active } = req.body;

    const payload = {};
    if (name !== undefined) payload.name = name.trim();
    if (location !== undefined) payload.location = location.trim();
    if (rating !== undefined) payload.rating = Math.max(1, Math.min(5, Number(rating) || 5));
    if (review !== undefined) payload.review = review.trim();
    if (date_text !== undefined) payload.date_text = date_text.trim();
    if (display_order !== undefined) payload.display_order = Number(display_order);
    if (is_active !== undefined) payload.is_active = is_active === true || is_active === "true";

    if (req.file) {
      if (existing.storage_key) {
        try {
          await deleteFile(existing.storage_key);
        } catch (delErr) {
          console.warn("Old avatar deletion failed:", delErr);
        }
      }
      const uploadResult = await uploadFile(req.file, "testimonials");
      payload.avatar = uploadResult.url;
      payload.storage_key = uploadResult.key || null;
    } else if (req.body.avatarUrl !== undefined) {
      payload.avatar = req.body.avatarUrl || null;
    }

    const updated = await updateTestimonial(id, payload);

    return res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update testimonial error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Toggle status
async function toggleTestimonialStatusHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const existing = await findTestimonialById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    const nextStatus = req.body.is_active !== undefined
      ? Boolean(req.body.is_active)
      : !existing.is_active;

    const updated = await updateTestimonial(id, { is_active: nextStatus });

    return res.status(200).json({
      success: true,
      message: `Testimonial marked as ${nextStatus ? "Active" : "Inactive"}`,
      data: updated,
    });
  } catch (error) {
    console.error("Toggle testimonial status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Reorder
async function reorderTestimonialsHandler(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items array is required" });
    }

    await reorderTestimonials(items);

    return res.status(200).json({
      success: true,
      message: "Testimonials reordered successfully",
    });
  } catch (error) {
    console.error("Reorder testimonials error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Delete
async function deleteTestimonialHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const existing = await findTestimonialById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    if (existing.storage_key) {
      try {
        await deleteFile(existing.storage_key);
      } catch (delErr) {
        console.warn("Avatar deletion failed:", delErr);
      }
    }

    await deleteTestimonial(id);

    return res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully",
    });
  } catch (error) {
    console.error("Delete testimonial error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Section settings
async function getSectionSettingsHandler(req, res) {
  try {
    const settings = await getSetting("customer_reviews_section");
    return res.status(200).json({
      success: true,
      data: settings || DEFAULT_SECTION_SETTINGS,
    });
  } catch (error) {
    console.error("Get testimonial section settings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function updateSectionSettingsHandler(req, res) {
  try {
    const { badge, title, subtitle } = req.body;
    const current = (await getSetting("customer_reviews_section")) || DEFAULT_SECTION_SETTINGS;

    const updated = {
      badge: badge !== undefined ? badge.trim() : current.badge,
      title: title !== undefined ? title.trim() : current.title,
      subtitle: subtitle !== undefined ? subtitle.trim() : current.subtitle,
    };

    await setSetting("customer_reviews_section", updated);

    return res.status(200).json({
      success: true,
      message: "Section settings updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update testimonial section settings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
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
};
