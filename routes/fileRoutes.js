const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");
const storageService = require("../services/storageService");
const { checkUploadLimit, trackDownloadLimit } = require("../middlewares/trafficLimiter");

// POST /files - use the storageService middleware
router.post("/", checkUploadLimit, storageService.singleFileUpload, fileController.uploadFile);

// GET /files/clean
// router.get("/clean", fileController.cleanInactiveFiles);

// GET /files/:publicKey
router.get("/:publicKey", trackDownloadLimit, fileController.downloadFile);

// DELETE /files/:privateKey
router.delete("/:privateKey", fileController.deleteFile);

module.exports = router;
