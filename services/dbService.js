const fs = require("fs");
const path = require("path");
const moment = require("moment");
const dbConfig = require("../config/db");
const {storageDriver} = require("../config/storage");
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
        const key = dbConfig.redisTrafficPrefix + today + "::" + ip;
        const trafficInfo = await redisClient.get(key);
        return trafficInfo ? JSON.parse(trafficInfo) : {upload: 0, download: 0};
    } else {
        if (storageDriver === "local") {
            const filePath = getFilePath(ip);
            if (!fs.existsSync(filePath)) return {upload: 0, download: 0};
            try {
                return JSON.parse(fs.readFileSync(filePath, "utf8"));
            } catch {
                return {upload: 0, download: 0};
            }
        }
    }
}

async function saveTrafficRecord(ip, record) {
    if (dbConfig.dbType === "redis") {
        const today = moment().format("YYYY-MM-DD");
        const key = dbConfig.redisTrafficPrefix + today + "::" + ip;
        console.log('Saving to redis key', key)
        // expire after 2 days
        await redisClient.set(key, JSON.stringify(record), {EX: 60 * 60 * 48});
    } else {
        if (storageDriver === "local") {
            const filePath = getFilePath(ip);
            console.log('record path', filePath)
            fs.writeFileSync(filePath, JSON.stringify(record));
        }
    }
}

async function saveMeta(publicKey, privateKey, meta) {
    if (dbConfig.dbType === "redis") {
        const key = dbConfig.redisMetaPrefix + publicKey;
        console.log('Saving to redis key', key)
        await redisClient.set(key, JSON.stringify(meta));
        const keyMap = dbConfig.privateKeyMapPrefix + privateKey;
        console.log('Saving to redis key', key)
        await redisClient.set(keyMap, publicKey);
    } else {
        const metaName = `${publicKey}.json`;
        const keymapName = `${privateKey}.key`;
        if (storageDriver === "local") {
            const buffer = Buffer.from(JSON.stringify(meta));
            const filePath = path.join(dbConfig.dbFolder, metaName);
            // console.log("Saving file to:", filePath);
            fs.writeFileSync(filePath, buffer);
        }
    }
}

async function getMeta(privateKey) {
    if (dbConfig.dbType === "redis") {
        const key = dbConfig.redisMetaPrefix + privateKey;
        const metaInfo = await redisClient.get(key);
        return metaInfo ? JSON.parse(metaInfo) : {};
    } else {
        const metaName = `${privateKey}.json`;
        if (storageDriver === "local") {
            const filePath = path.join(dbConfig.dbFolder, metaName);
            if (!fs.existsSync(filePath)) return null;
            return JSON.parse(fs.readFileSync(filePath));
        }
        /*    else if (storageDriver === "gcs") {
                const { Storage } = require("@google-cloud/storage");
                const bucketName = process.env.GCS_BUCKET;
                const storage = new Storage();
                const [contents] = await storage.bucket(bucketName).file(metaName).download();
                return JSON.parse(contents.toString());
            }*/
    }
}

async function deleteMeta(publicKey, privateKey) {
    if (dbConfig.dbType === "redis") {
        const key = dbConfig.redisMetaPrefix + publicKey;
        await redisClient.del(key);
        const keyMap = dbConfig.privateKeyMapPrefix + privateKey;
        await redisClient.del(keyMap);
    } else {
        const metaName = `${publicKey}.json`;
        if (storageDriver === "local") {
            const filePath = path.join(dbConfig.dbFolder, metaName);
            // console.log("Delete file from:", filePath);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
    }
}

async function findMeta(privateKey) {
    if (dbConfig.dbType === "redis") {
        const keyMap = dbConfig.privateKeyMapPrefix + privateKey;
        const keyInfo = await redisClient.get(keyMap);
        const key = keyInfo ? dbConfig.redisMetaPrefix + keyInfo : '';
        const metaInfo = await redisClient.get(key);
        return metaInfo ? JSON.parse(metaInfo) : {};
    } else {
        const metaName = `${privateKey}.json`;
        if (storageDriver === "local") {
            let meta;
            const metaFiles = fs.readdirSync(dbConfig.dbFolder).filter(f => f.endsWith(".json"));
            for (const mf of metaFiles) {
                const m = JSON.parse(fs.readFileSync(require("path").join(dbConfig.dbFolder, mf)));
                if (m.privateKey === privateKey) {
                    meta = m;
                    break;
                }
            }
            return meta
        }
    }
}

async function getInactiveFiles(inActiveDays) {
    const allMeta = [];
    if (dbConfig.dbType === "redis") {
        const pattern = dbConfig.redisMetaPrefix + "*";
        const now = Date.now();
        const maxAgeMs = inActiveDays * 24 * 60 * 60 * 1000;

        let cursor = '0';
        // console.log("pattern", pattern);
        do {
            const {cursor: newCursor, keys} = await redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });
            cursor = newCursor;
            // console.log("keys", keys);

            if (keys.length) {
                // fetch all values in a batch
                const values = await redisClient.mGet(keys);

                values.forEach((v, i) => {
                    if (!v) return;
                    const meta = JSON.parse(v);
                    // console.log("meta i", i, keys[i]);
                    const lastDownloadedAt = meta.lastDownloadedAt || meta.uploadedAt;
                    if (lastDownloadedAt) {
                        const inactivityMs = now - new Date(lastDownloadedAt).getTime();
                        // console.log("inactivityMs,maxAgeMs", inactivityMs, maxAgeMs);
                        if (inactivityMs >= maxAgeMs) {
                            // console.log(meta.fileName)
                            allMeta.push(meta);
                        }
                    }
                });
            }
        } while (cursor !== '0');

    } else {
        if (storageDriver === "local") {
            const metaFiles = fs.readdirSync(dbConfig.dbFolder).filter(f => f.endsWith(".json"));
            for (const mf of metaFiles) {
                const metaPath = path.join(dbConfig.dbFolder, mf);
                const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
                if (getInactiveDays(meta) >= inActiveDays) {
                    allMeta.push(meta);
                }
            }
        }
    }

    return allMeta;
}

function getInactiveDays(meta) {
    const lastDownloadedAt = meta.lastDownloadedAt || meta.uploadedAt;
    const now = Date.now();
    if (lastDownloadedAt) {
        const inactivityMs = now - new Date(lastDownloadedAt).getTime();
        return inactivityMs / (1000 * 60 * 60 * 24);
    }

    return 0;
}

module.exports = {
    getTrafficRecord,
    saveTrafficRecord,
    saveMeta,
    getMeta,
    deleteMeta,
    findMeta,
    getInactiveFiles
};
