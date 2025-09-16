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

// POST /files
exports.uploadFile = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
    const privateKey = crypto.randomBytes(16).toString("hex");

    let meta, publicKeyId, fileName;

    if (encryptionEnable) {
        const { publicKeyPem, privateKeyPem } = generateKeyPair();
        const { key: aesKey, iv } = generateAesKey();
        const encryptedFileBuffer = aesEncrypt(fileBuffer, aesKey, iv);
        const aesBundle = Buffer.concat([aesKey, iv]);
        const encryptedAesBundle = rsaEncrypt(aesBundle, publicKeyPem);
        publicKeyId = crypto.createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 16);
        fileName = `${publicKeyId}_${req.file.originalname}.enc`;

        meta = {
            publicKeyId,
            publicKeyPem,
            privateKeyPem,
            encryptedAesBundle: encryptedAesBundle.toString("base64"),
            fileName,
            originalName: req.file.originalname,
            privateKey,
        };

        await saveFile(fileName, encryptedFileBuffer);
        await saveMeta(publicKeyId, privateKey, meta);

    } else {

        publicKeyId = crypto.randomBytes(8).toString("hex");
        fileName = `${publicKeyId}_${req.file.originalname}`;
        meta = { publicKeyId, fileName, originalName: req.file.originalname, privateKey };

        await saveFile(fileName, fileBuffer);
        await saveMeta(publicKeyId, privateKey, meta);
    }

    fs.unlinkSync(req.file.path);

    return res.json({ publicKey: publicKeyId, privateKey });
};

// GET /files/:publicKey
exports.downloadFile = async (req, res) => {
    const { publicKey } = req.params;
    const meta = await getMeta(publicKey);
    if (!meta) return res.status(404).json({ error: "File not found" });

    const stream = await getFileStream(meta.fileName);
    const mimeType = mime.lookup(meta.originalName) || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${meta.originalName}"`);

    if (encryptionEnable && meta.encryptedAesBundle) {
        const aesBundleBuffer = rsaDecrypt(
            Buffer.from(meta.encryptedAesBundle, "base64"),
            meta.privateKeyPem
        );
        const aesKey = aesBundleBuffer.slice(0, 32);
        const iv = aesBundleBuffer.slice(32, 48);
        const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
        stream.pipe(decipher).pipe(res).on("error", err => {
            console.error(err);
            if (!res.headersSent) res.status(500).end("Error while streaming file");
        });
    } else {
        stream.pipe(res);
    }
};

// DELETE /files/:privateKey
exports.deleteFile = async (req, res) => {
    const { privateKey } = req.params;

    let meta = await findMeta(privateKey);

    if (!meta) return res.status(404).json({ error: "File not found or invalid token" });

    await storageDeleteFile(meta.fileName);
    await deleteMeta(meta.publicKeyId, privateKey);
    return res.json({ message: "File deleted successfully" });
};
