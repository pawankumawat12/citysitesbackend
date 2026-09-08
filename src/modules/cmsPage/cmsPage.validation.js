const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "cart",
  "checkout",
  "contact",
  "dashboard",
  "favorites",
  "forgot-password",
  "login",
  "menu",
  "notifications",
  "offers",
  "offline",
  "orders",
  "profile",
  "reset-password",
  "reviews",
  "settings",
  "uploads",
  "webhooks",
  "wishlist",
]);

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateCmsPageCreate(body) {
  const errors = {};
  const { title, slug, content, status, isActive, seoTitle, seoDescription, seoKeywords } = body || {};

  // Title
  if (!title || typeof title !== "string" || !title.trim()) {
    errors.title = "Page title is required";
  } else if (title.trim().length < 2) {
    errors.title = "Page title must be at least 2 characters";
  } else if (title.trim().length > 255) {
    errors.title = "Page title cannot exceed 255 characters";
  }

  // Slug
  const computedSlug = normalizeSlug(slug || title);
  if (!computedSlug) {
    errors.slug = "Page slug is required";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(computedSlug)) {
    errors.slug = "Page slug must contain only lowercase letters, numbers, and hyphens";
  } else if (RESERVED_SLUGS.has(computedSlug)) {
    errors.slug = `'${computedSlug}' is a reserved system path and cannot be used as a page slug`;
  }

  // Content
  if (!content || typeof content !== "string" || !content.trim()) {
    errors.content = "Page content is required";
  }

  // Status
  if (status !== undefined && status !== "draft" && status !== "published") {
    errors.status = "Status must be either 'draft' or 'published'";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      title: title ? title.trim() : "",
      slug: computedSlug,
      content: content || "",
      status: status === "draft" ? "draft" : "published",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      seoTitle: seoTitle ? String(seoTitle).trim() : null,
      seoDescription: seoDescription ? String(seoDescription).trim() : null,
      seoKeywords: seoKeywords ? String(seoKeywords).trim() : null,
    },
  };
}

function validateCmsPageUpdate(body) {
  const errors = {};
  const { title, slug, content, status, isActive, seoTitle, seoDescription, seoKeywords } = body || {};
  const data = {};

  if (title !== undefined) {
    if (!title || typeof title !== "string" || !title.trim()) {
      errors.title = "Page title cannot be empty";
    } else if (title.trim().length < 2) {
      errors.title = "Page title must be at least 2 characters";
    } else if (title.trim().length > 255) {
      errors.title = "Page title cannot exceed 255 characters";
    } else {
      data.title = title.trim();
    }
  }

  if (slug !== undefined) {
    const computedSlug = normalizeSlug(slug);
    if (!computedSlug) {
      errors.slug = "Page slug cannot be empty";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(computedSlug)) {
      errors.slug = "Page slug must contain only lowercase letters, numbers, and hyphens";
    } else if (RESERVED_SLUGS.has(computedSlug)) {
      errors.slug = `'${computedSlug}' is a reserved system path and cannot be used as a page slug`;
    } else {
      data.slug = computedSlug;
    }
  }

  if (content !== undefined) {
    if (!content || typeof content !== "string" || !content.trim()) {
      errors.content = "Page content cannot be empty";
    } else {
      data.content = content;
    }
  }

  if (status !== undefined) {
    if (status !== "draft" && status !== "published") {
      errors.status = "Status must be either 'draft' or 'published'";
    } else {
      data.status = status;
    }
  }

  if (isActive !== undefined) {
    data.isActive = Boolean(isActive);
  }

  if (seoTitle !== undefined) {
    data.seoTitle = seoTitle ? String(seoTitle).trim() : null;
  }

  if (seoDescription !== undefined) {
    data.seoDescription = seoDescription ? String(seoDescription).trim() : null;
  }

  if (seoKeywords !== undefined) {
    data.seoKeywords = seoKeywords ? String(seoKeywords).trim() : null;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data,
  };
}

module.exports = {
  RESERVED_SLUGS,
  normalizeSlug,
  validateCmsPageCreate,
  validateCmsPageUpdate,
};

