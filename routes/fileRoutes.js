const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");
const storageService = require("../services/storageService");

// POST /files - use the storageService middleware
router.post("/", storageService.singleFileUpload, fileController.uploadFile);

// GET /files/:publicKey
router.get("/:publicKey", fileController.downloadFile);

// DELETE /files/:privateKey
router.delete("/:deleteToken", fileController.deleteFile);

module.exports = router;
