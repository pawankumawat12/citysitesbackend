const cloudinaryStorage = require("./cloudinary.storage");
const localStorage = require("./local.storage");

const PROVIDERS = {
  cloudinary: cloudinaryStorage,
  local: localStorage,
};

function getActiveProvider() {
  const providerKey = (process.env.STORAGE_PROVIDER || "cloudinary").toLowerCase().trim();
  const provider = PROVIDERS[providerKey];

  if (!provider) {
    console.warn(`[StorageService] Unknown provider "${providerKey}". Defaulting to "local".`);
    return PROVIDERS.local;
  }

  return provider;
}

async function uploadFile(file, options = {}) {
  if (!file || !file.buffer) {
    throw new Error("Invalid file upload: file buffer is missing.");
  }

  const provider = getActiveProvider();
  try {
    return await provider.uploadFile(file, options);
  } catch (err) {
    // If the active provider (e.g. Cloudinary) fails (403 forbidden, quota, offline),
    // automatically fallback to local storage so user operations never fail!
    if (provider !== PROVIDERS.local) {
      console.warn(
        `[StorageService] Provider "${process.env.STORAGE_PROVIDER || "cloudinary"}" failed (${err.message || err}). Falling back to local disk storage.`
      );
      try {
        return await PROVIDERS.local.uploadFile(file, options);
      } catch (localErr) {
        console.error("[StorageService] Local storage fallback also failed:", localErr);
        throw err;
      }
    }
    throw err;
  }
}

async function deleteFile(keyOrUrl, options = {}) {
  if (!keyOrUrl) return { success: false, message: "No key or URL provided" };

  // If the path is a local uploads path, delete via local provider
  if (
    typeof keyOrUrl === "string" &&
    (keyOrUrl.startsWith("/uploads/") || keyOrUrl.startsWith("uploads/"))
  ) {
    return PROVIDERS.local.deleteFile(keyOrUrl, options);
  }

  const provider = getActiveProvider();
  try {
    return await provider.deleteFile(keyOrUrl, options);
  } catch (err) {
    return PROVIDERS.local.deleteFile(keyOrUrl, options);
  }
}

async function deleteFiles(keysOrUrls, options = {}) {
  if (!Array.isArray(keysOrUrls) || keysOrUrls.length === 0) {
    return [];
  }

  const validItems = keysOrUrls.filter((item) => typeof item === "string" && item.trim().length > 0);
  if (validItems.length === 0) return [];

  const results = await Promise.allSettled(
    validItems.map((item) => deleteFile(item, options))
  );

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { success: false, error: r.reason?.message }
  );
}

module.exports = {
  uploadFile,
  deleteFile,
  deleteFiles,
};
