const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { tmpUploadDir, uploadDir, encryptionEnable, storageDriver } = require("../config/storage");
const { saveMeta, getMeta, deleteMeta, findMeta } = require("../services/dbService");

// Ensure tmp upload folder exists
if (!fs.existsSync(tmpUploadDir)) {
    fs.mkdirSync(tmpUploadDir, { recursive: true });
}

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Define storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tmpUploadDir);
    },
    filename: function (req, file, cb) {
        // temp name; controller may rename later
        cb(null, Date.now() + "_" + file.originalname);
    },
});

// Create multer instance
const upload = multer({ storage });

async function saveFile(fileName, buffer) {
    if (storageDriver === "local") {
        const filePath = path.join(uploadDir, fileName);
        // console.log("Saving file to:", filePath);
        fs.writeFileSync(filePath, buffer);
        return { filePath };
    }
/*    else if (storageDriver === "gcs") {
        // use @google-cloud/storage here
        const { Storage } = require("@google-cloud/storage");
        const bucketName = process.env.GCS_BUCKET;
        const storage = new Storage();
        await storage.bucket(bucketName).file(fileName).save(buffer);
        return { filePath: `gs://${bucketName}/${fileName}` };
    }*/
}

async function getFileStream(fileName) {
    if (storageDriver === "local") {
        const filePath = path.join(uploadDir, fileName);
        // console.log("Reading file from:", filePath);
        return fs.createReadStream(filePath);
    }
/*    else if (storageDriver === "gcs") {
        const { Storage } = require("@google-cloud/storage");
        const bucketName = process.env.GCS_BUCKET;
        const storage = new Storage();
        return storage.bucket(bucketName).file(fileName).createReadStream();
    }*/
}

async function deleteFile(fileName) {
    if (storageDriver === "local") {
        const filePath = path.join(uploadDir, fileName);
        // console.log("Delete file from:", filePath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
/*    else if (storageDriver === "gcs") {
        const { Storage } = require("@google-cloud/storage");
        const bucketName = process.env.GCS_BUCKET;
        const storage = new Storage();
        await storage.bucket(bucketName).file(fileName).delete({ ignoreNotFound: true });
    }*/
}

/*
async function saveMeta(privateKey, meta) {
    const metaName = `${privateKey}.json`;
    const buffer = Buffer.from(JSON.stringify(meta));
    return saveFile(metaName, buffer);
}

async function getMeta(privateKey) {
    const metaName = `${privateKey}.json`;
    if (storageDriver === "local") {
        const filePath = path.join(uploadDir, metaName);
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath));
    }
/!*    else if (storageDriver === "gcs") {
        const { Storage } = require("@google-cloud/storage");
        const bucketName = process.env.GCS_BUCKET;
        const storage = new Storage();
        const [contents] = await storage.bucket(bucketName).file(metaName).download();
        return JSON.parse(contents.toString());
    }*!/
}

async function deleteMeta(privateKey) {
    const metaName = `${privateKey}.json`;
    return deleteFile(metaName);
}

// search through meta files to find matching privateKey
async function findMeta(privateKey) {
    let meta;
    const metaFiles = fs.readdirSync(uploadDir).filter(f => f.endsWith(".json"));
    for (const mf of metaFiles) {
        const m = JSON.parse(fs.readFileSync(require("path").join(uploadDir, mf)));
        if (m.privateKey === privateKey) {
            meta = m;
            break;
        }
    }

    return meta
}
*/

// Export an interface
module.exports = {
    singleFileUpload: upload.single("file"), // middleware for one file
    uploadDir, // export the folder path for other code to use
    encryptionEnable, // export the folder path for other code to use
    saveFile,
    getFileStream,
    deleteFile,
    saveMeta,
    getMeta,
    deleteMeta,
    findMeta,
};
