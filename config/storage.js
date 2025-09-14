const path = require("path");
require("dotenv").config();

const uploadDir = process.env.FOLDER || path.join(__dirname, "../uploads");

module.exports = {
    uploadDir: path.resolve(uploadDir) // always absolute path
};
