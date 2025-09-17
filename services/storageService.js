const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { logDir, tmpUploadDir, uploadDir, encryptionEnable, storageDriver } = require("../config/storage");
const { saveMeta, getMeta, deleteMeta, findMeta } = require("../services/dbService");

/** Ensure log write folder exists */
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
/** Ensure tmp upload folder exists */
if (!fs.existsSync(tmpUploadDir)) {
    fs.mkdirSync(tmpUploadDir, { recursive: true });
}
/** Ensure file folder exists */
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/** Define storage engine for uploading files */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tmpUploadDir);
    },
    filename: function (req, file, cb) {
        // temp name; controller may rename later
        cb(null, Date.now() + "_" + file.originalname);
    },
});

/** Create multer instance */
const upload = multer({ storage });

/**
 * Save buffer to a file
 * @param fileName
 * @param buffer
 * @returns {Promise<{filePath: string}>}
 */
async function saveFile(fileName, buffer) {
    if (storageDriver === "local") {
        const filePath = path.join(uploadDir, fileName);
        // console.log("Saving file to:", filePath);
        fs.writeFileSync(filePath, buffer);
        return { filePath };
    }
}

/**
 * Get file buffer for given file name
 * @param fileName
 * @returns {Promise<ReadStream>}
 */
async function getFileStream(fileName) {
    if (storageDriver === "local") {
        const filePath = path.join(uploadDir, fileName);
        // console.log("Reading file from:", filePath);
        return fs.createReadStream(filePath);
    }
}

/**
 * Deleta a file where file name is given
 * @param fileName
 * @returns {Promise<void>}
 */
async function deleteFile(fileName) {
    if (storageDriver === "local") {
        const filePath = path.join(uploadDir, fileName);
        // console.log("Delete file from:", filePath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
}

/**
 * Write a log string to a log file
 * @param logFile log file where to append
 * @param logStr string that will be written
 * @returns {Promise<void>}
 */
async function writeLog(logFile, logStr) {
    const timestamp = new Date().toISOString();
    const logEntry = timestamp + " - " + logStr + "\n"
    fs.appendFileSync(logFile, logEntry, "utf8");
}

// Export an interface
module.exports = {
    singleFileUpload: upload.single("file"), // middleware for one file
    uploadDir, // export the folder path for other code to use
    encryptionEnable,
    saveFile,
    getFileStream,
    deleteFile,
    saveMeta,
    getMeta,
    deleteMeta,
    findMeta,
    writeLog
};
