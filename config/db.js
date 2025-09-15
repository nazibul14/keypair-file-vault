require("dotenv").config();

module.exports = {
    dbType: process.env.DB_TYPE || "file",
    redisHost: process.env.REDIS_HOST || "127.0.0.1",
    redisPort: process.env.REDIS_PORT || "6379",
    redisPassword: process.env.REDIS_PASSWORD || undefined,
};
