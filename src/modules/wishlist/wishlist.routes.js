const express = require("express");
const { verifyToken, isAdmin } = require("../../../middleware/auth.middleware");
const {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  toggleWishlist,
  clearWishlist,
  getAdminFavourites,
} = require("./wishlist.controller");

const router = express.Router();

router.use(verifyToken);

// Admin routes
router.get("/admin/favourites", isAdmin, getAdminFavourites);

// Customer wishlist routes
router.get("/", getWishlist);
router.post("/items", addWishlistItem);
router.delete("/items/:productId", removeWishlistItem);
router.post("/toggle", toggleWishlist);
router.delete("/", clearWishlist);

module.exports = router;

