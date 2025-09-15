const fs = require("fs");
const path = require("path");
const moment = require("moment");
const dbConfig = require("../config/db");
let redisClient = null;

// If Redis selected, init once
if (dbConfig.dbType === "redis") {
    const redis = require("redis");
    redisClient = redis.createClient({
        socket: {
            host: dbConfig.redisHost,
            port: dbConfig.redisPort
        },
        password: dbConfig.redisPassword,
    });

    redisClient.connect().catch(console.error);

} else if (dbConfig.dbType === "file") {
    // Ensure folder exists
    if (!fs.existsSync(dbConfig.dbFolder)) {
        fs.mkdirSync(dbConfig.dbFolder, {recursive: true});
    }
}

function getFilePath(ip) {
    const today = moment().format("YYYY-MM-DD");
    const dir = path.join(dbConfig.dbFolder, today);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    const sanitizedIp = ip.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return path.join(dir, `${sanitizedIp}.json`);
}

async function getTrafficRecord(ip) {
    if (dbConfig.dbType === "redis") {
        const today = moment().format("YYYY-MM-DD");
        const key = `${today}:${ip}`;
        const json = await redisClient.get(key);
        return json ? JSON.parse(json) : {upload: 0, download: 0};
    } else {
        const filePath = getFilePath(ip);
        if (!fs.existsSync(filePath)) return {upload: 0, download: 0};
        try {
            return JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch {
            return {upload: 0, download: 0};
        }
    }
}

async function saveTrafficRecord(ip, record) {
    if (dbConfig.dbType === "redis") {
        const today = moment().format("YYYY-MM-DD");
        const key = `${today}:${ip}`;
        console.log('Saving to redis key', key)
        // expire after 2 days
        await redisClient.set(key, JSON.stringify(record), {EX: 60 * 60 * 48});
    } else {
        const filePath = getFilePath(ip);
        console.log('record path', filePath)
        fs.writeFileSync(filePath, JSON.stringify(record));
    }
}

// Public API
module.exports = {
    getTrafficRecord,
    saveTrafficRecord
};
