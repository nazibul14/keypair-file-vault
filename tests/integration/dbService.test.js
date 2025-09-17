const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const redis = require('redis');
const moment = require('moment');

// WARNING: This test suite runs against a live environment.
// Ensure you have a Redis server running and that the test folder is
// disposable, as tests will perform real file I/O and Redis operations.

// We will mock the configuration files directly to control the environment
let dbConfig = {
    dbType: 'file',
    redisHost: '127.0.0.1',
    redisPort: 6379,
    redisPassword: 'Nopass@1234', // Change this if your Redis requires a password
    redisTrafficPrefix: 'test::traffic::',
    redisMetaPrefix: 'test::meta::',
    privateKeyMapPrefix: 'test::keymap::',
    dbFolder: path.join(__dirname, 'test_data')
};

let storageConfig = {
    storageDriver: 'local'
};

const cleanUpRedisKeys = async (client, pattern) => {
    let cursor = '0';
    do {
        const { cursor: newCursor, keys } = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        if (keys.length > 0) {
            await client.del(keys);
        }
        cursor = newCursor;
    } while (cursor !== '0');
};

const cleanUpFiles = (dirPath) => {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath, { withFileTypes: true }).forEach(entry => {
            const entryPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                cleanUpFiles(entryPath);
                fs.rmdirSync(entryPath);
            } else {
                fs.unlinkSync(entryPath);
            }
        });
        fs.rmdirSync(dirPath);
    }
};

describe('Data Access Layer (Integration Tests)', () => {

    // --- Tests for File-based Storage ---
    describe('File DB Type', () => {
        let dbModule;
        const testFolder = dbConfig.dbFolder;

        beforeEach(() => {
            // Set DB type and reload the module to trigger file system logic
            dbConfig.dbType = 'file';
            dbModule = require('../../services/dbService');

            // Ensure a clean test environment for each run
            cleanUpFiles(testFolder);
            fs.mkdirSync(testFolder, { recursive: true });
        });

        afterEach(() => {
            // console.log('afterEach File DB Type')
            cleanUpFiles(testFolder);
            // console.log('afterEach File DB Type end')
        });

        describe('TrafficRecord', () => {
            it('should get the same value of traffic record as inserted', async () => {
                const ip = '127.0.0.1.999';
                await dbModule.saveTrafficRecord(ip,{ upload: 200, download: 150 });
                const result = await dbModule.getTrafficRecord(ip);

                expect(result).to.deep.equal({ upload: 200, download: 150 });
            });
        });

        describe('Meta', () => {
            it('should get the same value of meta record as insert', async () => {
                const publicKey = 'new_pubkey_file';
                const privateKey = 'new_privkey_file';
                const meta = { data: 'new_meta_file' };

                await dbModule.saveMeta(publicKey, privateKey, meta);
                const result = await dbModule.getMeta(publicKey);
                expect(result).to.deep.equal(meta);
            });
        });

    });

    // --- Tests for Redis Storage ---
    describe('Redis DB Type', () => {
        let dbModule;
        let redisClient;

        before(async () => {
            dbConfig.dbType = 'redis';
            dbModule = require('../../services/dbService');

            redisClient = redis.createClient({
                socket: {
                    host: dbConfig.redisHost,
                    port: dbConfig.redisPort
                },
                password: dbConfig.redisPassword
            });
            await redisClient.connect();
        });

        after(async () => {
            // console.log('afterEach Redis DB Type')
            await cleanUpRedisKeys(redisClient, `${dbConfig.redisMetaPrefix}*`);
            await cleanUpRedisKeys(redisClient, `${dbConfig.redisTrafficPrefix}*`);
            await cleanUpRedisKeys(redisClient, `${dbConfig.privateKeyMapPrefix}*`);
            await redisClient.quit();
            // console.log('afterEach Redis DB Type end')
        });

        describe('TrafficRecord', () => {
            it('should get the same value of traffic record as inserted', async () => {

                const ip = '127.0.0.1.999';
                await dbModule.saveTrafficRecord(ip,{ upload: 200, download: 150 });
                const result = await dbModule.getTrafficRecord(ip);

                expect(result).to.deep.equal({ upload: 200, download: 150 });

            });
        });

        describe('Meta', () => {
            it('should save meta and key map to Redis', async () => {

                const publicKey = 'new_pubkey_file';
                const privateKey = 'new_privkey_file';
                const meta = { data: 'new_meta_file' };

                await dbModule.saveMeta(publicKey, privateKey, meta);
                const result = await dbModule.getMeta(publicKey);
                expect(result).to.deep.equal(meta);

            });
        });

    });
});
