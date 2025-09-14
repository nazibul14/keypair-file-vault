const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mime = require("mime-types");
const {uploadDir, encryptionEnable} = require("../services/storageService");
const {
    generateKeyPair,
    generateAesKey,
    aesEncrypt,
    aesDecrypt,
    rsaEncrypt,
    rsaDecrypt,
} = require("../utils/cryptoHelper");

// POST /files
exports.uploadFile = (req, res) => {
    if (!req.file) return res.status(400).json({error: "No file uploaded"});

    let publicKeyId;
    let fileBuffer = fs.readFileSync(req.file.path);
    let meta = {};
    // generate short delete token
    const deleteToken = crypto.randomBytes(16).toString("hex");

    if (encryptionEnable) {
        // generate RSA pair + AES key
        const {publicKeyPem, privateKeyPem} = generateKeyPair();
        const {key: aesKey, iv} = generateAesKey();

        // encrypt file with AES
        const encryptedFileBuffer = aesEncrypt(fileBuffer, aesKey, iv);

        // encrypt AES key+iv with RSA public key
        const aesBundle = Buffer.concat([aesKey, iv]); // 32+16=48 bytes
        const encryptedAesBundle = rsaEncrypt(aesBundle, publicKeyPem);

        publicKeyId = crypto.createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 16);
        const encryptedFileName = `${publicKeyId}_${req.file.originalname}.enc`;

        // write encrypted file
        fs.writeFileSync(path.join(uploadDir, encryptedFileName), encryptedFileBuffer);

        // write metadata (publicKey, privateKey, encrypted AES key)
        meta = {
            publicKeyId,
            publicKeyPem,
            privateKeyPem,
            encryptedAesBundle: encryptedAesBundle.toString("base64"),
            fileName: encryptedFileName,
            originalName: req.file.originalname,
            deleteToken,
        };
        fs.writeFileSync(path.join(uploadDir, `${publicKeyId}.json`), JSON.stringify(meta));
        fs.unlinkSync(req.file.path);

        return res.json({
            publicKey: publicKeyId,
            privateKey: privateKeyPem,
            deleteToken,
        });

    } else {
        // no encryption: store as plain file
        publicKeyId = crypto.randomBytes(8).toString("hex");
        const plainFileName = `${publicKeyId}_${req.file.originalname}`;
        fs.writeFileSync(path.join(uploadDir, plainFileName), fileBuffer);
        meta = {publicKeyId, fileName: plainFileName, originalName: req.file.originalname, deleteToken};
        fs.writeFileSync(path.join(uploadDir, `${deleteToken}.json`), JSON.stringify(meta));
        fs.unlinkSync(req.file.path);

        return res.json({
            publicKey: publicKeyId,
            deleteToken,
        });

    }

};

// GET /files/:publicKey
exports.downloadFile = (req, res) => {
    const { publicKey } = req.params;

    if (encryptionEnable) {
        const metaPath = path.join(uploadDir, `${publicKey}.json`);
        if (!fs.existsSync(metaPath)) {
            return res.status(404).json({ error: "File not found" });
        }

        const meta = JSON.parse(fs.readFileSync(metaPath));
        const encryptedFilePath = path.join(uploadDir, meta.fileName);
        if (!fs.existsSync(encryptedFilePath)) {
            return res.status(404).json({ error: "File not found" });
        }

        // recover AES key + iv
        const aesBundleBuffer = rsaDecrypt(
            Buffer.from(meta.encryptedAesBundle, "base64"),
            meta.privateKeyPem
        );
        const aesKey = aesBundleBuffer.slice(0, 32);
        const iv = aesBundleBuffer.slice(32, 48);

        const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);

        const mimeType =
            mime.lookup(meta.originalName) || "application/octet-stream";

        res.setHeader("Content-Type", mimeType);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${meta.originalName}"`
        );

        // stream: encrypted file -> decipher -> response
        fs.createReadStream(encryptedFilePath)
            .pipe(decipher)
            .pipe(res)
            .on("error", (err) => {
                console.error(err);
                if (!res.headersSent)
                    res.status(500).end("Error while streaming file");
            });
    } else {
        // no encryption: stream plain file directly
        const fileName = fs
            .readdirSync(uploadDir)
            .find((f) => f.startsWith(publicKey + "_"));
        if (!fileName) return res.status(404).json({ error: "File not found" });

        const filePath = path.join(uploadDir, fileName);
        const mimeType = mime.lookup(fileName) || "application/octet-stream";

        res.setHeader("Content-Type", mimeType);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName.replace(publicKey + "_", "")}"`
        );
        fs.createReadStream(filePath).pipe(res);
    }
};

// DELETE /files/:deleteToken
exports.deleteFile = (req, res) => {
    const { deleteToken } = req.params;

    const metaFiles = fs.readdirSync(uploadDir).filter(f => f.endsWith(".json"));
    let foundMeta;
    for (const mf of metaFiles) {
        const meta = JSON.parse(fs.readFileSync(path.join(uploadDir, mf)));
        if (meta.deleteToken === deleteToken) {
            foundMeta = meta;
            break;
        }
    }
    if (!foundMeta) return res.status(404).json({error: "File not found or invalid token"});

    const filePath = path.join(uploadDir, foundMeta.fileName);
    console.log(filePath)
    const metaPath = path.join(uploadDir, `${foundMeta.publicKeyId}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    return res.json({message: "File deleted successfully"});
};