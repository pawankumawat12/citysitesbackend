const express = require("express");
const { verifyToken, isAdmin } = require("../../../middleware/auth.middleware");
const {
  listStores,
  getStore,
  getStats,
  getOwnerCandidates,
  createStoreHandler,
  updateStoreHandler,
  updateStoreStatusHandler,
  toggleStoreActiveHandler,
  deleteStoreHandler,
} = require("./store.controller");

const router = express.Router();

// All store routes require Admin authentication & authorization
router.use(verifyToken, isAdmin);

// List & Stats
router.get("/", listStores);
router.get("/stats", getStats);
router.get("/owners/candidates", getOwnerCandidates);

// Single store operations
router.get("/:id", getStore);
router.post("/", createStoreHandler);
router.put("/:id", updateStoreHandler);
router.patch("/:id/status", updateStoreStatusHandler);
router.patch("/:id/toggle-active", toggleStoreActiveHandler);
router.delete("/:id", deleteStoreHandler);

module.exports = router;

