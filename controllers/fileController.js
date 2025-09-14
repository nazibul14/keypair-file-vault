const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { uploadDir } = require("../config/storage");

function generateKey() {
    return crypto.randomBytes(16).toString("hex");
}

exports.index = (req, res) => {
    res.render("home", { title: "File Manager" });
};

exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const publicKey = generateKey();
    const privateKey = generateKey();

    // rename file to include publicKey
    const oldPath = req.file.path;
    const newFileName = `${publicKey}_${req.file.originalname}`;
    const newPath = path.join(uploadDir, newFileName);

    fs.renameSync(oldPath, newPath);

    const metaPath = path.join(uploadDir, `${publicKey}.json`);
    fs.writeFileSync(
        metaPath,
        JSON.stringify({ publicKey, privateKey, fileName: newFileName })
    );

    res.json({ publicKey, privateKey });
};

exports.downloadFile = (req, res) => {
    const { publicKey } = req.params;
    const metaPath = path.join(uploadDir, `${publicKey}.json`);

    if (!fs.existsSync(metaPath)) {
        return res.status(404).json({ error: "File not found" });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath));
    const filePath = path.join(uploadDir, meta.fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    res.download(filePath, meta.fileName.split("_").slice(1).join("_"));
};

exports.deleteFile = (req, res) => {
    const { privateKey } = req.params;

    const metaFiles = fs.readdirSync(uploadDir).filter(f => f.endsWith(".json"));
    let foundMeta;

    for (const mf of metaFiles) {
        const meta = JSON.parse(fs.readFileSync(path.join(uploadDir, mf)));
        if (meta.privateKey === privateKey) {
            foundMeta = meta;
            break;
        }
    }

    if (!foundMeta) {
        return res.status(404).json({ error: "File not found or invalid key" });
    }

    const filePath = path.join(uploadDir, foundMeta.fileName);
    const metaPath = path.join(uploadDir, `${foundMeta.publicKey}.json`);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    res.json({ message: "File deleted successfully" });
};