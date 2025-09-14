const express = require("express");
const multer = require("multer");
const path = require("path");
const fileController = require("../controllers/fileController");
const { uploadDir } = require("../config/storage");

const router = express.Router();

// ensure folder exists
const fs = require("fs");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // now from config
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "_" + file.originalname);
    },
});

const upload = multer({ storage });

// Routes
router.get("/files", fileController.index);
router.post("/files", upload.single("file"), fileController.uploadFile);
router.get("/files/:publicKey", fileController.downloadFile);
router.delete("/files/:privateKey", fileController.deleteFile);

module.exports = router;
