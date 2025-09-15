const path = require("path");
require("dotenv").config();

const tmpUploadDir = path.join(__dirname, "../uploads");
const uploadDir = process.env.FOLDER || path.join(__dirname, "../uploads");

module.exports = {
    tmpUploadDir: path.resolve(tmpUploadDir), //1st uploaded folder before encrypt
    uploadDir: path.resolve(uploadDir), // always absolute path
    encryptionEnable: process.env.ENCRYPTION?.toLowerCase() === 'true' ?? true,
    storageDriver: process.env.STORAGE_DRIVER || "local",
};
