require("dotenv").config();

module.exports = {
    dailyUploadLimit: parseInt(process.env.DAILY_UPLOAD_LIMIT || "1000000"),
    dailyDownloadLimit: parseInt(process.env.DAILY_DOWNLOAD_LIMIT || "2000000"),
};
