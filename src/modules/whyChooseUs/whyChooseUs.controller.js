const {
  parsePagination,
  buildPaginationMeta,
} = require("../../../config/pagination");
const {
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
} = require("../../models/whyChooseUs.model");
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
  badge: "Why Choose Us",
  title: "More Than Just",
  highlight: "Fast Food",
  subtitle: "We believe great food starts with great ingredients, careful preparation and a whole lot of love.",
  cta_text: "Taste The Difference",
  cta_href: "/menu",
};

// Public: Get all active items + section settings
async function getActiveWhyChooseUs(req, res) {
  try {
    const [items, sectionSettings] = await Promise.all([
      findActiveItems(),
      getSetting("why_choose_us_section"),
    ]);

    return res.status(200).json({
      success: true,
      message: "Active Why Choose Us items fetched successfully",
      data: {
        items,
        section: sectionSettings || DEFAULT_SECTION_SETTINGS,
      },
    });
  } catch (error) {
    console.error("Get active why choose us error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Get all items with pagination, filter, and stats
async function getAdminWhyChooseUs(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const search = req.query.search ? req.query.search.trim() : undefined;
    const isActive = req.query.status || req.query.isActive;
    const sortBy = req.query.sortBy || "display_order";
    const sortOrder = req.query.sortOrder || "asc";

    const [items, total, stats, sectionSettings] = await Promise.all([
      findItems({ page, limit, offset, search, isActive, sortBy, sortOrder }),
      countItems({ search, isActive }),
      getItemStats(),
      getSetting("why_choose_us_section"),
    ]);

    return res.status(200).json({
      success: true,
      message: "Why Choose Us items fetched successfully",
      data: {
        items,
        pagination: buildPaginationMeta(page, limit, total),
        stats,
        section: sectionSettings || DEFAULT_SECTION_SETTINGS,
      },
    });
  } catch (error) {
    console.error("Get admin why choose us error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Get by ID
async function getItemByIdHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const item = await findItemById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Get why choose us by ID error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Create item
async function createItemHandler(req, res) {
  try {
    const { title, description, icon, color_class, display_order, is_active } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: "Description is required" });
    }

    let imageUrl = req.body.imageUrl || null;
    let storageKey = null;

    if (req.file) {
      const uploadResult = await uploadFile(req.file, "why-choose-us");
      imageUrl = uploadResult.url;
      storageKey = uploadResult.key || null;
    }

    const maxOrder = await getMaxDisplayOrder();
    const parsedOrder = display_order !== undefined ? Number(display_order) : maxOrder + 1;
    const activeBool = is_active === undefined ? true : is_active === true || is_active === "true";

    const newItem = await createItem({
      title: title.trim(),
      description: description.trim(),
      icon: icon && icon.trim() ? icon.trim() : "Leaf",
      image: imageUrl,
      storage_key: storageKey,
      color_class: color_class ? color_class.trim() : "bg-[var(--color-primary-50)] text-[var(--color-primary)]",
      display_order: isNaN(parsedOrder) ? 1 : parsedOrder,
      is_active: activeBool,
    });

    return res.status(201).json({
      success: true,
      message: "Why Choose Us item created successfully",
      data: newItem,
    });
  } catch (error) {
    console.error("Create why choose us item error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Update item
async function updateItemHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const existing = await findItemById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const { title, description, icon, color_class, display_order, is_active } = req.body;

    const payload = {};
    if (title !== undefined) payload.title = title.trim();
    if (description !== undefined) payload.description = description.trim();
    if (icon !== undefined) payload.icon = icon.trim();
    if (color_class !== undefined) payload.color_class = color_class.trim();
    if (display_order !== undefined) payload.display_order = Number(display_order);
    if (is_active !== undefined) payload.is_active = is_active === true || is_active === "true";

    if (req.file) {
      if (existing.storage_key) {
        try {
          await deleteFile(existing.storage_key);
        } catch (delErr) {
          console.warn("Old image deletion failed:", delErr);
        }
      }
      const uploadResult = await uploadFile(req.file, "why-choose-us");
      payload.image = uploadResult.url;
      payload.storage_key = uploadResult.key || null;
    } else if (req.body.imageUrl !== undefined) {
      payload.image = req.body.imageUrl || null;
    }

    const updated = await updateItem(id, payload);

    return res.status(200).json({
      success: true,
      message: "Why Choose Us item updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update why choose us item error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Toggle status
async function toggleItemStatusHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const existing = await findItemById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const nextStatus = req.body.is_active !== undefined
      ? Boolean(req.body.is_active)
      : !existing.is_active;

    const updated = await updateItem(id, { is_active: nextStatus });

    return res.status(200).json({
      success: true,
      message: `Item marked as ${nextStatus ? "Active" : "Inactive"}`,
      data: updated,
    });
  } catch (error) {
    console.error("Toggle why choose us status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Reorder
async function reorderItemsHandler(req, res) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items array is required" });
    }

    await reorderItems(items);

    return res.status(200).json({
      success: true,
      message: "Why Choose Us items reordered successfully",
    });
  } catch (error) {
    console.error("Reorder why choose us items error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin: Delete item
async function deleteItemHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const existing = await findItemById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (existing.storage_key) {
      try {
        await deleteFile(existing.storage_key);
      } catch (delErr) {
        console.warn("Image deletion failed:", delErr);
      }
    }

    await deleteItem(id);

    return res.status(200).json({
      success: true,
      message: "Why Choose Us item deleted successfully",
    });
  } catch (error) {
    console.error("Delete why choose us item error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Admin & Public: Section header settings
async function getSectionSettingsHandler(req, res) {
  try {
    const settings = await getSetting("why_choose_us_section");
    return res.status(200).json({
      success: true,
      data: settings || DEFAULT_SECTION_SETTINGS,
    });
  } catch (error) {
    console.error("Get why choose us section settings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function updateSectionSettingsHandler(req, res) {
  try {
    const { badge, title, highlight, subtitle, cta_text, cta_href } = req.body;
    const current = (await getSetting("why_choose_us_section")) || DEFAULT_SECTION_SETTINGS;

    const updated = {
      badge: badge !== undefined ? badge.trim() : current.badge,
      title: title !== undefined ? title.trim() : current.title,
      highlight: highlight !== undefined ? highlight.trim() : current.highlight,
      subtitle: subtitle !== undefined ? subtitle.trim() : current.subtitle,
      cta_text: cta_text !== undefined ? cta_text.trim() : current.cta_text,
      cta_href: cta_href !== undefined ? cta_href.trim() : current.cta_href,
    };

    await setSetting("why_choose_us_section", updated);

    return res.status(200).json({
      success: true,
      message: "Section settings updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update why choose us section settings error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
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
};
