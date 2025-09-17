const fs = require("fs");
const crypto = require("crypto");
const mime = require("mime-types");
const {
    generateKeyPair,
    generateAesKey,
    aesEncrypt,
    aesDecrypt,
    rsaEncrypt,
    rsaDecrypt,
} = require("../utils/cryptoHelper");
const {
    encryptionEnable,
    saveFile,
    getFileStream,
    deleteFile: storageDeleteFile,
    saveMeta,
    getMeta,
    deleteMeta,
    findMeta,
} = require("../services/storageService");
// const {cleanupOldFiles} = require("../services/cleanupService");

/**
 * POST /files
 * File upload request
 * @param req request parameter for uploading file. here only file is needed
 * @param res response object passed by app
 * @returns {Promise<*>} return a json object
 */
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({error: "No file uploaded"});

        const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
        /** Generate random privateKey */
        const privateKey = crypto.randomBytes(16).toString("hex");

        let meta, publicKeyId, fileName;

        if (encryptionEnable) {
            /** Generate RSA key pair */
            const {publicKeyPem, privateKeyPem} = generateKeyPair();
            /** Generate AES key + IV */
            const {key: aesKey, iv} = generateAesKey();
            /** Encrypt file buffer with AES */
            const encryptedFileBuffer = aesEncrypt(fileBuffer, aesKey, iv);
            /** Encrypt AES bundle with RSA public key */
            const aesBundle = Buffer.concat([aesKey, iv]);
            const encryptedAesBundle = rsaEncrypt(aesBundle, publicKeyPem);
            /** Generate publicKey*/
            publicKeyId = crypto.createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 16);
            /** build a filename */
            fileName = `${publicKeyId}_${req.file.originalname}.enc`;
            /** Create file meta */
            meta = {
                publicKeyId,
                publicKeyPem,
                privateKeyPem,
                encryptedAesBundle: encryptedAesBundle.toString("base64"),
                fileName,
                originalName: req.file.originalname,
                privateKey,
                uploadedAt: new Date().toISOString(),
                lastDownloadedAt: new Date().toISOString(),
            };

            /** Save file to configured folder */
            await saveFile(fileName, encryptedFileBuffer);
            /** Save meta to storage */
            await saveMeta(publicKeyId, privateKey, meta);

        } else {
            /** Generate random publicKey */
            publicKeyId = crypto.randomBytes(8).toString("hex");
            /** build a filename */
            fileName = `${publicKeyId}_${req.file.originalname}`;
            meta = {
                publicKeyId,
                fileName,
                originalName: req.file.originalname,
                privateKey,
                uploadedAt: new Date().toISOString(),
                lastDownloadedAt: new Date().toISOString(),
            };

            /** Save file to configured folder */
            await saveFile(fileName, fileBuffer);
            /** Save meta to storage */
            await saveMeta(publicKeyId, privateKey, meta);
        }

        /** Delete temp uploaded file */
        fs.unlinkSync(req.file.path);

        return res.json({publicKey: publicKeyId, privateKey});

    } catch (e) {
        console.error(e);
        return res.status(500).json({error: "Server Error"});
    }
};

/**
 * GET /files/:publicKey
 * send the file in stream
 * @param req request parameter for download. publicKey
 * @param res response object passed by app
 * @returns {Promise<*>} file stream
 */
exports.downloadFile = async (req, res) => {
    try {
        const {publicKey} = req.params;
        /** Get file meta */
        const meta = await getMeta(publicKey);
        if (!meta || !meta.hasOwnProperty('fileName')) {
            return res.status(404).json({error: "File not found"});
        }
        /** Save last download time in meta for calculation inactive file */
        meta.lastDownloadedAt = new Date().toISOString();
        await saveMeta(publicKey, meta.privateKey, meta);

        /** get file from configured folder */
        const stream = await getFileStream(meta.fileName);
        const mimeType = mime.lookup(meta.originalName) || "application/octet-stream";

        /** Set response header */
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${meta.originalName}"`);

        if (encryptionEnable && meta.encryptedAesBundle) {
            /** Decrypt AES bundle with RSA private key */
            const aesBundleBuffer = rsaDecrypt(
                Buffer.from(meta.encryptedAesBundle, "base64"),
                meta.privateKeyPem
            );
            /** Create decipher stream with AES key & IV */
            const aesKey = aesBundleBuffer.slice(0, 32);
            const iv = aesBundleBuffer.slice(32, 48);
            const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
            /** Pipe the encrypted file stream through decipher directly to HTTP response */
            stream.pipe(decipher).pipe(res).on("error", err => {
                console.error(err);
                if (!res.headersSent) res.status(500).end("Error while streaming file");
            });
        } else {
            stream.pipe(res);
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({error: "Server Error"});
    }
};

/**
 * DELETE /files/:privateKey
 * delete a file with privateKey
 * @param request parameter for delete. privateKey field is mandatory
 * @param res
 * @returns {Promise<*>}
 */
exports.deleteFile = async (req, res) => {
    try {
        const {privateKey} = req.params;
        /** get meta info from privateKey */
        let meta = await findMeta(privateKey);

        if (!meta) return res.status(404).json({error: "File not found or invalid token"});

        /** delete from storage */
        await storageDeleteFile(meta.fileName);
        /** delete from meta */
        await deleteMeta(meta.publicKeyId, privateKey);
        
        return res.json({code: 200, message: "File deleted successfully"});

    } catch (e) {
        console.error(e);
        return res.status(500).json({error: "Server Error"});
    }
};

// GET /files/clean
/*
exports.cleanInactiveFiles = async (req, res) => {
    await cleanupOldFiles();
    return res.json({ message: "Files cleaned" });
};*/
