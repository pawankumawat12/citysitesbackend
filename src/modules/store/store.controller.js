const {
  parsePagination,
  buildPaginationMeta,
} = require("../../../config/pagination");
const {
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
} = require("../../models/store.model");
const db = require("../../../config/db");
const {
  validateStoreCreate,
  validateStoreUpdate,
  ALLOWED_STATUSES,
} = require("./store.validation");

function parseId(param) {
  const num = parseInt(param, 10);
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * List stores with search, status filters, and pagination
 * (Admin only)
 */
async function listStores(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const {
      search = "",
      status = "",
      is_active = "",
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    const filterArgs = {
      page,
      limit,
      offset,
      search: typeof search === "string" ? search.trim() : "",
      status: typeof status === "string" ? status.trim() : "",
      is_active,
      sortBy,
      sortOrder,
    };

    const [stores, total, stats] = await Promise.all([
      findStores(filterArgs),
      countStores(filterArgs),
      getStoreStats(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Stores retrieved successfully",
      data: stores,
      stats,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Error listing stores:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stores",
    });
  }
}

/**
 * Get single store details by ID
 * (Admin only)
 */
async function getStore(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid store ID" });
    }

    const store = await findStoreById(id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    return res.status(200).json({
      success: true,
      data: store,
    });
  } catch (error) {
    console.error("Error fetching store:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve store",
    });
  }
}

/**
 * Get store statistics
 * (Admin only)
 */
async function getStats(req, res) {
  try {
    const stats = await getStoreStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching store stats:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch store statistics",
    });
  }
}

/**
 * Get candidates for store owner assignment
 * (Admin only)
 */
async function getOwnerCandidates(req, res) {
  try {
    const candidates = await getEligibleStoreOwners();
    return res.status(200).json({
      success: true,
      data: candidates,
    });
  } catch (error) {
    console.error("Error fetching owner candidates:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch eligible owners",
    });
  }
}

/**
 * Create a new store
 * (Admin only)
 */
async function createStoreHandler(req, res) {
  try {
    const { valid, errors, data } = validateStoreCreate(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Check slug uniqueness
    const existing = await findStoreBySlug(data.slug);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Store slug '${data.slug}' is already taken. Please choose a unique slug.`,
      });
    }

    // Create the store
    const newStore = await createStore(data);

    // If an owner was assigned, update that user's store_id and promote to storeowner if currently 'user'
    if (data.created_by) {
      const owner = await db("users").where({ id: data.created_by }).first();
      if (owner) {
        const updates = { store_id: newStore.id };
        if (owner.role === "user") {
          updates.role = "storeowner";
        }
        await db("users").where({ id: owner.id }).update(updates);
      }
    }

    const fullStore = await findStoreById(newStore.id);

    return res.status(201).json({
      success: true,
      message: "Store created successfully",
      data: fullStore || newStore,
    });
  } catch (error) {
    console.error("Error creating store:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create store",
    });
  }
}

/**
 * Update an existing store
 * (Admin only)
 */
async function updateStoreHandler(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid store ID" });
    }

    const existingStore = await findStoreById(id);
    if (!existingStore) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const { valid, errors, data } = validateStoreUpdate(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existingStore.slug) {
      const slugConflict = await findStoreBySlug(data.slug);
      if (slugConflict && slugConflict.id !== id) {
        return res.status(409).json({
          success: false,
          message: `Store slug '${data.slug}' is already in use by another store.`,
        });
      }
    }

    const updated = await updateStore(id, data);

    // Handle owner assignment changes
    if (data.created_by !== undefined && data.created_by !== existingStore.created_by) {
      // Unlink previous owner's store_id if they only had this store
      if (existingStore.created_by) {
        await db("users")
          .where({ id: existingStore.created_by, store_id: id })
          .update({ store_id: null });
      }

      // Link new owner
      if (data.created_by) {
        const newOwner = await db("users").where({ id: data.created_by }).first();
        if (newOwner) {
          const updates = { store_id: id };
          if (newOwner.role === "user") {
            updates.role = "storeowner";
          }
          await db("users").where({ id: newOwner.id }).update(updates);
        }
      }
    }

    const fullStore = await findStoreById(id);

    return res.status(200).json({
      success: true,
      message: "Store updated successfully",
      data: fullStore || updated,
    });
  } catch (error) {
    console.error("Error updating store:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update store",
    });
  }
}

/**
 * Quick update store status (PENDING, APPROVED, REJECTED)
 * (Admin only)
 */
async function updateStoreStatusHandler(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid store ID" });
    }

    const { status } = req.body;
    if (!status || !ALLOWED_STATUSES.includes(String(status).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const existing = await findStoreById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const updated = await updateStoreStatus(id, status);

    return res.status(200).json({
      success: true,
      message: `Store status changed to ${status.toUpperCase()}`,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating store status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update store status",
    });
  }
}

/**
 * Toggle store active state
 * (Admin only)
 */
async function toggleStoreActiveHandler(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid store ID" });
    }

    const existing = await findStoreById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const nextActive =
      req.body.is_active !== undefined ? Boolean(req.body.is_active) : !existing.is_active;

    const updated = await toggleStoreActive(id, nextActive);

    return res.status(200).json({
      success: true,
      message: `Store is now ${nextActive ? "Active" : "Inactive"}`,
      data: updated,
    });
  } catch (error) {
    console.error("Error toggling store active state:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update store operational state",
    });
  }
}

/**
 * Delete a store
 * (Admin only)
 */
async function deleteStoreHandler(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid store ID" });
    }

    const existing = await findStoreById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    await deleteStore(id);

    return res.status(200).json({
      success: true,
      message: `Store '${existing.name}' was deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting store:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete store",
    });
  }
}

module.exports = {
  listStores,
  getStore,
  getStats,
  getOwnerCandidates,
  createStoreHandler,
  updateStoreHandler,
  updateStoreStatusHandler,
  toggleStoreActiveHandler,
  deleteStoreHandler,
};

