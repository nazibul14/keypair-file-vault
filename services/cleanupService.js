const fs = require("fs");
const path = require("path");

const { cleanupInactivityDays } = require("../config/storage");
const { deleteFile, deleteMeta } = require("./storageService");
const { getInactiveFiles } = require("./dbService");

async function cleanupOldFiles() {

    const cleanFileInfo = await getInactiveFiles(cleanupInactivityDays);

    cleanFileInfo.forEach((meta, i) => {
        if (!meta) return;
        deleteFile(meta.fileName);
        deleteMeta(meta.publicKeyId, meta.privateKey);
    });

}

module.exports = { cleanupOldFiles };
