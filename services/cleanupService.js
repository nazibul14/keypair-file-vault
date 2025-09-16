const fs = require("fs");
const path = require("path");

const { cleanupInactivityDays } = require("../config/storage");
const { uploadDir } = require("./storageService"); // your upload dir

function cleanupOldFiles() {
    const metaFiles = fs.readdirSync(uploadDir).filter(f => f.endsWith(".json"));
    const now = Date.now();

    for (const metaFile of metaFiles) {
        const metaPath = path.join(uploadDir, metaFile);
        let meta;
        try {
            meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        } catch (err) {
            console.error("Could not parse meta file", metaFile, err);
            continue;
        }

        // If no download time, fall back to upload time (or skip)
        const lastDownloadedAt = meta.lastDownloadedAt || meta.uploadedAt;
        if (!lastDownloadedAt) continue;

        const inactivityMs = now - new Date(lastDownloadedAt).getTime();
        const inactivityInDays = inactivityMs / (1000 * 60 * 60 * 24);

        if (inactivityInDays >= cleanupInactivityDays) {
            console.log(`Deleting inactive file ${meta.fileName}`);

            const filePath = path.join(uploadDir, meta.fileName);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
        }
    }
}

module.exports = { cleanupOldFiles };
