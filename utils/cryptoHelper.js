const crypto = require("crypto");

/** Generate a new RSA key pair (PEM) */
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "pkcs1", format: "pem" },
        privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/** Generate random AES key + IV */
function generateAesKey() {
    return {
        key: crypto.randomBytes(32), // 256-bit AES key
        iv: crypto.randomBytes(16),  // 128-bit IV
    };
}

/** Encrypt buffer with AES key+iv */
function aesEncrypt(buffer, key, iv) {
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([cipher.update(buffer), cipher.final()]);
}

/** Decrypt buffer with AES key+iv */
function aesDecrypt(buffer, key, iv) {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
}

/**  Encrypt small data (AES key+iv) with RSA public key */
function rsaEncrypt(buffer, publicKeyPem) {
    return crypto.publicEncrypt(
        {
            key: publicKeyPem,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        buffer
    );
}

/**  Decrypt small data with RSA private key */
function rsaDecrypt(buffer, privateKeyPem) {
    return crypto.privateDecrypt(
        {
            key: privateKeyPem,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        buffer
    );
}

module.exports = {
    generateKeyPair,
    generateAesKey,
    aesEncrypt,
    aesDecrypt,
    rsaEncrypt,
    rsaDecrypt,
};
