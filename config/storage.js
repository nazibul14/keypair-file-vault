const path = require("path");
require("dotenv").config();

const tmpUploadDir = path.join(__dirname, "../storage/uploads");
const uploadDir = process.env.FOLDER || path.join(__dirname, "../storage/uploads");

module.exports = {
    tmpUploadDir: path.resolve(tmpUploadDir), //1st uploaded folder before encrypt
    uploadDir: path.resolve(uploadDir), // always absolute path
    encryptionEnable: process.env.ENCRYPTION?.toLowerCase() === 'true' ?? true,
    storageDriver: process.env.PROVIDER || "local",
    cleanupInactivityDays: parseInt(process.env.CLEANUP_INACTIVITY_DAYS || "30", 10),
    cleanupRunMillis: parseInt(process.env.CLEANUP_RUN_INTERVAL_MIN || "60", 10) * 1000,
};
