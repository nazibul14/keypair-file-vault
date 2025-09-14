const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { uploadDir } = require("../config/storage");

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Define storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // temp name; controller may rename later
        cb(null, Date.now() + "_" + file.originalname);
    },
});

// Create multer instance
const upload = multer({ storage });

// Export an interface
module.exports = {
    singleFileUpload: upload.single("file"), // middleware for one file
    uploadDir, // export the folder path for other code to use
};
