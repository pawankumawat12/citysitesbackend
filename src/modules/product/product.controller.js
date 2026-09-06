const {
  parsePagination,
  buildPaginationMeta,
} = require("../../../config/pagination");
const { findCategoryById } = require("../../models/category.model");
const {
  findProductById,
  findProducts,
  countProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProductStatus,
  bulkDeleteProducts,
} = require("../../models/product.model");
const {
  listActiveOffersCustomer,
  attachOffersToProducts,
  getApplicableOffersForProduct,
} = require("../../models/offer.model");
const {
  validateProductCreate,
  validateProductUpdate,
  validateProductListQuery,
} = require("./product.validation");

function parseIdParam(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

async function listProducts(req, res) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { valid, errors, filters } = validateProductListQuery(req.query);

    if (!valid) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    // Validate the category server-side before querying its products.
    if (filters.categoryId !== undefined) {
      const category = await findCategoryById(filters.categoryId);
      if (!category) {
        return res.status(400).json({
          message: "Category not found for the given filter",
        });
      }
    }

    const [products, total, activeOffers] = await Promise.all([
      findProducts({ page, limit, offset, ...filters }),
      countProducts(filters),
      listActiveOffersCustomer().catch((err) => {
        console.error("Error fetching active offers for listProducts:", err);
        return [];
      }),
    ]);

    const productsWithOffers = attachOffersToProducts(products, activeOffers);

    return res.status(200).json({
      message: "Products fetched successfully",
      data: productsWithOffers,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("List products error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

async function getProductById(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Invalid product ID" });
    } 

    const product = await findProductById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!Array.isArray(product.offers)) {
      const activeOffers = await listActiveOffersCustomer().catch((err) => {
        console.error("Error fetching active offers for getProductById:", err);
        return [];
      });
      product.offers = getApplicableOffersForProduct(product, activeOffers);
    }

    return res.status(200).json({
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

async function createProductHandler(req, res) {
  try {
    const { name, description, price, stock, availabilityType, categoryId, isActive } =
      req.body || {};

    const images = (req.files || []).map((file) => `/uploads/${file.filename}`);
    const { valid, errors, data } = validateProductCreate({
      name,
      description,
      price,
      stock,
      availabilityType,
      images,
      categoryId,
      isActive,
    });

    if (!valid) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    const category = await findCategoryById(data.category_id);
    if (!category) {
      return res.status(400).json({
        message: "Category not found",
      });
    }

    const product = await createProduct(data);
    const productWithCategory = await findProductById(product.id);

    return res.status(201).json({
      message: "Product created successfully",
      data: productWithCategory,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "Invalid category reference",
      });
    }

    return res.status(500).json({ message: "Server error" });
  }
}

async function updateProductHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const existingProduct = await findProductById(id);

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const {
      name,
      description,
      price,
      stock,
      availabilityType,
      categoryId,
      isActive,
      existingImages,
    } = req.body || {};

    /*
     * Existing images that frontend wants to keep
     */
    let keptImages = [];

    if (existingImages) {
      try {
        keptImages =
          typeof existingImages === "string"
            ? JSON.parse(existingImages)
            : existingImages;
      } catch {
        return res.status(400).json({
          message: "Invalid existingImages format",
        });
      }
    }

    if (!Array.isArray(keptImages)) {
      return res.status(400).json({
        message: "existingImages must be an array",
      });
    }

    /*
     * New uploaded images
     */
    const newImages = (req.files || []).map(
      (file) => `/uploads/${file.filename}`
    );

    /*
     * Final images
     *
     * Existing images user kept
     * +
     * Newly uploaded images
     */
    const images = [
      ...keptImages,
      ...newImages,
    ];

    /*
     * Maximum 5 images
     */
    if (images.length > 5) {
      return res.status(400).json({
        message: "Maximum 5 images are allowed",
      });
    }

    const { valid, errors, data } =
      validateProductUpdate({
        name,
        description,
        price,
        stock,
        availabilityType,
        images,
        categoryId,
        isActive,
      });

    if (!valid) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    if (data.category_id) {
      const category = await findCategoryById(
        data.category_id
      );

      if (!category) {
        return res.status(400).json({
          message: "Category not found",
        });
      }
    }

    await updateProduct(id, data);

    const product = await findProductById(id);

    return res.status(200).json({
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "Invalid category reference",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
}

async function deleteProductHandler(req, res) {
  try {
    const id = parseIdParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const existingProduct = await findProductById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    await deleteProduct(id);

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

async function bulkUpdateProductStatusHandler(req, res) {
  try {
    const { ids, isActive } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids must be a non-empty array of product IDs" });
    }
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive boolean is required" });
    }

    const updatedProducts = await bulkUpdateProductStatus(ids, isActive);
    return res.status(200).json({
      message: `Successfully updated ${updatedProducts.length} product(s)`,
      count: updatedProducts.length,
      data: updatedProducts,
    });
  } catch (error) {
    console.error("Bulk update product status error:", error);
    return res.status(500).json({ message: "Server error updating products" });
  }
}

async function bulkDeleteProductsHandler(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids must be a non-empty array of product IDs" });
    }

    const deletedCount = await bulkDeleteProducts(ids);
    return res.status(200).json({
      message: `Successfully deleted ${deletedCount} product(s)`,
      count: deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete products error:", error);
    return res.status(500).json({ message: "Server error deleting products" });
  }
}

async function exportProductsHandler(req, res) {
  try {
    const { valid, errors, filters } = validateProductListQuery(req.query);
    if (!valid) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // Retrieve all matching products without page limits
    const products = await findProducts({
      limit: 10000,
      offset: 0,
      ...filters,
    });

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return "";
      let str = typeof val === "object" ? JSON.stringify(val) : String(val);
      if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "ID",
      "Name",
      "Category",
      "Price",
      "Stock",
      "Fulfillment",
      "Status",
      "Created At",
    ];

    const rows = products.map((p) => [
      p.id,
      p.name,
      p.category_name || "",
      p.price,
      p.stock,
      p.availability_type || "IN_STOCK",
      p.is_active ? "Active" : "Out of stock",
      p.created_at ? new Date(p.created_at).toISOString() : "",
    ]);

    const csvContent =
      headers.map(escapeCsv).join(",") +
      "\r\n" +
      rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="products-export-${dateStr}.csv"`);
    // Prepend UTF-8 BOM
    return res.status(200).send("\uFEFF" + csvContent);
  } catch (error) {
    console.error("Export products error:", error);
    return res.status(500).json({ message: "Server error exporting products" });
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  bulkUpdateProductStatusHandler,
  bulkDeleteProductsHandler,
  exportProductsHandler,
};
