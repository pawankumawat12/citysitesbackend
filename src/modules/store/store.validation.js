const ALLOWED_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

/**
 * Helper to slugify string
 */
function slugify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Validate store creation payload
 */
function validateStoreCreate(data = {}) {
  const errors = {};

  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    errors.name = "Store name is required.";
  } else if (data.name.trim().length > 255) {
    errors.name = "Store name cannot exceed 255 characters.";
  }

  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  if (!slug) {
    errors.slug = "Store slug is required and must contain alphanumeric characters.";
  } else if (slug.length > 255) {
    errors.slug = "Store slug cannot exceed 255 characters.";
  }

  if (data.delivery_radius_km !== undefined && data.delivery_radius_km !== null && data.delivery_radius_km !== "") {
    const radius = Number(data.delivery_radius_km);
    if (isNaN(radius) || radius < 0 || radius > 500) {
      errors.delivery_radius_km = "Delivery radius must be a number between 0 and 500 km.";
    }
  }

  if (data.status && !ALLOWED_STATUSES.includes(data.status.toUpperCase())) {
    errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(", ")}.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      name: data.name?.trim(),
      slug,
      delivery_radius_km: data.delivery_radius_km !== undefined && data.delivery_radius_km !== "" ? Number(data.delivery_radius_km) : 10.0,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      status: data.status ? data.status.toUpperCase() : "PENDING",
      created_by: data.created_by ? Number(data.created_by) : null,
    },
  };
}

/**
 * Validate store update payload
 */
function validateStoreUpdate(data = {}) {
  const errors = {};
  const sanitized = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      errors.name = "Store name cannot be empty.";
    } else if (data.name.trim().length > 255) {
      errors.name = "Store name cannot exceed 255 characters.";
    } else {
      sanitized.name = data.name.trim();
    }
  }

  if (data.slug !== undefined) {
    const slug = slugify(data.slug);
    if (!slug) {
      errors.slug = "Store slug cannot be empty.";
    } else if (slug.length > 255) {
      errors.slug = "Store slug cannot exceed 255 characters.";
    } else {
      sanitized.slug = slug;
    }
  }

  if (data.delivery_radius_km !== undefined) {
    const radius = Number(data.delivery_radius_km);
    if (isNaN(radius) || radius < 0 || radius > 500) {
      errors.delivery_radius_km = "Delivery radius must be a number between 0 and 500 km.";
    } else {
      sanitized.delivery_radius_km = radius;
    }
  }

  if (data.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(String(data.status).toUpperCase())) {
      errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(", ")}.`;
    } else {
      sanitized.status = String(data.status).toUpperCase();
    }
  }

  if (data.is_active !== undefined) {
    sanitized.is_active = Boolean(data.is_active);
  }

  if (data.created_by !== undefined) {
    sanitized.created_by = data.created_by ? Number(data.created_by) : null;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: sanitized,
  };
}

module.exports = {
  slugify,
  validateStoreCreate,
  validateStoreUpdate,
  ALLOWED_STATUSES,
};

