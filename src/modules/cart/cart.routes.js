const express = require("express");
const { verifyToken } = require("../../../middleware/auth.middleware");
const {
  getCart,
  addCartItem,
  updateCartItem,
  deleteCartItem,
  deleteCart,
  getGuestCartPreview,
  mergeGuestCart,
} = require("./cart.controller");

const router = express.Router();

// Public guest cart preview route (no authentication required)
router.post("/guest-preview", getGuestCartPreview);

// Authenticated user cart routes
router.use(verifyToken);
router.get("/", getCart);
router.post("/items", addCartItem);
router.patch("/items/:productId", updateCartItem);
router.delete("/items/:productId", deleteCartItem);
router.delete("/", deleteCart);
router.post("/merge", mergeGuestCart);

module.exports = router;
