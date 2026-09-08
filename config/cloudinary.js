require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { v2: cloudinary } = require("cloudinary");



if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
    // secure: true,
  });
} else {
  // console.table([process.env.CLOUDINARY_CLOUD_NAME,process.env.CLOUDINARY_API_KEY,process.env.CLOUDINARY_API_SECRET])
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.Cloud_Name,
    api_key: process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_Key,
    api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_Secret,
    // secure: true,
  });
}

module.exports = cloudinary;
