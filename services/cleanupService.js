const {cleanupInactivityDays, logDir, cleanupLogFile} = require("../config/storage");
const {deleteFile, deleteMeta, writeLog} = require("./storageService");
const {getInactiveFiles} = require("./dbService");
const path = require("path");

async function cleanupOldFiles() {
    const logFile = path.join(logDir, cleanupLogFile);
    try {
        writeLog(logFile, "cleanup old files");

        const cleanFileInfo = await getInactiveFiles(cleanupInactivityDays);

        cleanFileInfo.forEach((meta, i) => {
            if (!meta) return;
            deleteFile(meta.fileName);
            deleteMeta(meta.publicKeyId, meta.privateKey);
            writeLog(logFile, "deleted file: " + meta.fileName + " - publicKey: " + meta.publicKeyId);
        });

    } catch (e) {
        console.error(e);
        writeLog(logFile, "error: " + e.getMessage());
    }
}

module.exports = {cleanupOldFiles};
