const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function uploadFile(file, options = {}) {
  if (!file || !file.buffer) {
    throw new Error("File buffer is required for upload");
  }

  const folder = options.folder || "general";
  const uploadDir = path.join(__dirname, "../../../uploads", folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
  const uniqueName = `${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}${ext}`;
  const filePath = path.join(uploadDir, uniqueName);

  await fs.promises.writeFile(filePath, file.buffer);

  const relativeUrl = `/uploads/${folder}/${uniqueName}`;
  return {
    url: relativeUrl,
    key: relativeUrl,
    provider: "local",
    bytes: file.size || file.buffer.length,
  };
}

async function deleteFile(keyOrUrl) {
  if (!keyOrUrl || typeof keyOrUrl !== "string") {
    return { success: false, message: "No key or URL provided" };
  }

  let relPath = keyOrUrl.trim();
  if (/^https?:\/\//i.test(relPath)) {
    const idx = relPath.indexOf("/uploads/");
    if (idx !== -1) {
      relPath = relPath.slice(idx);
    }
  }

  if (relPath.startsWith("/")) {
    relPath = relPath.slice(1);
  }

  const fullPath = path.join(__dirname, "../../../", relPath);
  try {
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return { success: true, result: "deleted" };
    }
    return { success: true, result: "not_found" };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = {
  uploadFile,
  deleteFile,
};
