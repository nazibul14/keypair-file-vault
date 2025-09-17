const { dailyUploadLimit, dailyDownloadLimit} = require("../config/api");
const dbService = require("../services/dbService");

async function checkUploadLimit(req, res, next) {
    const ip = req.ip;
    let record = await dbService.getTrafficRecord(ip);
    if (!record) record = { download: 0, upload: 0 };

    const contentLength = parseInt(req.headers["content-length"] || "0");
    if (record.upload + contentLength > dailyUploadLimit) {
        return res.status().json({ error: "Daily upload limit reached" });
    }

    res.on("finish", async () => {
        record.upload += contentLength;
        await dbService.saveTrafficRecord(ip, record);
    });

    next();
}

async function trackDownloadLimit(req, res, next) {
    const ip = req.ip;
    let record = await dbService.getTrafficRecord(ip);
    if (!record) record = { download: 0, upload: 0 };

    if (record.download >= dailyDownloadLimit) {
        return res.status(429).json({ error: "Daily download limit reached" });
    }

    let bytesSent = 0;
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk, encoding, callback) {
        if (chunk) bytesSent += chunk.length;
        return originalWrite.call(this, chunk, encoding, callback);
    };

    res.end = function (chunk, encoding, callback) {
        if (chunk) bytesSent += chunk.length;
        return originalEnd.call(this, chunk, encoding, callback);
    };

    res.on("finish", async () => {
        record.download += bytesSent;
        await dbService.saveTrafficRecord(ip, record);
    });

    next();
}

module.exports = { checkUploadLimit, trackDownloadLimit };
