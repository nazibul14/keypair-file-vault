const path = require("path");
require("dotenv").config();

const dbFolder = process.env.FILE_DB_FOLDER || path.join(__dirname, "../storage/database");

module.exports = {
    dbType: process.env.DB_TYPE || "file",
    dbFolder: path.resolve(dbFolder),
    redisHost: process.env.REDIS_HOST || "127.0.0.1",
    redisPort: parseInt(process.env.REDIS_PORT || "6379"),
    redisPassword: process.env.REDIS_PASSWORD || undefined,
    redisMetaPrefix: "META::",
    redisTrafficPrefix: "TRAFFIC::",
    privateKeyMapPrefix: "KEYMAP::",
};
