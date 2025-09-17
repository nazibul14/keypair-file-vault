const { expect } = require('chai');
const {
    generateKeyPair,
    generateAesKey,
    aesEncrypt,
    aesDecrypt,
    rsaEncrypt,
    rsaDecrypt,
} = require('../../utils/cryptoHelper');

describe('Crypto Helper Functions', () => {
    let keyPair;
    let aesKey;
    let originalData;
    let encryptedAesKey;
    let secretMessage;

    before(() => {
        // This block runs once before all tests
        keyPair = generateKeyPair();
        aesKey = generateAesKey();
        originalData = Buffer.from('keypair-file-vault crypto testing.');
        secretMessage = Buffer.from('a-secret-key-to-share');
    });

    it('should generate a valid RSA key pair', () => {
        expect(keyPair).to.be.an('object');
        expect(keyPair).to.have.all.keys('publicKeyPem', 'privateKeyPem');
        expect(keyPair.publicKeyPem).to.include('BEGIN RSA PUBLIC KEY');
        expect(keyPair.privateKeyPem).to.include('BEGIN RSA PRIVATE KEY');
    });

    it('should generate a valid AES key and IV', () => {
        expect(aesKey).to.be.an('object');
        expect(aesKey).to.have.all.keys('key', 'iv');
        expect(aesKey.key).to.be.an.instanceOf(Buffer);
        expect(aesKey.key.length).to.equal(32);
        expect(aesKey.iv).to.be.an.instanceOf(Buffer);
        expect(aesKey.iv.length).to.equal(16);
    });

    it('should correctly encrypt and decrypt data with AES', () => {
        const encryptedData = aesEncrypt(originalData, aesKey.key, aesKey.iv);
        const decryptedData = aesDecrypt(encryptedData, aesKey.key, aesKey.iv);

        expect(encryptedData).to.be.an.instanceOf(Buffer);
        expect(decryptedData.toString()).to.equal(originalData.toString());
        expect(encryptedData.toString('hex')).to.not.equal(originalData.toString('hex'));
    });

/*    it('should correctly encrypt small data with RSA public key', () => {
        const dataToEncrypt = Buffer.from(secretMessage);
        encryptedAesKey = rsaEncrypt(dataToEncrypt, keyPair.publicKeyPem);

        expect(encryptedAesKey).to.be.an.instanceOf(Buffer);
        expect(encryptedAesKey.length).to.be.above(0);
        expect(encryptedAesKey.toString('hex')).to.not.equal(dataToEncrypt.toString('hex'));
    });*/

/*    it('should correctly decrypt small data with RSA private key', () => {
        const decryptedAesKey = rsaDecrypt(encryptedAesKey, keyPair.privateKeyPem);

        expect(decryptedAesKey).to.be.an.instanceOf(Buffer);
        expect(decryptedAesKey.toString()).to.equal(secretMessage);
    });*/

    it('should perform a full hybrid encryption and decryption cycle', () => {
        // Step 1: Generate keys
        const data = Buffer.from('keyvalue-file-vault end-to-end data passing with crypto');
        const { publicKeyPem, privateKeyPem } = generateKeyPair();
        const { key: aesKey, iv: aesIv } = generateAesKey();

        // Step 2: Encrypt data with AES
        const encryptedData = aesEncrypt(data, aesKey, aesIv);

        // Step 3: Encrypt the AES key with RSA public key
        const encryptedAesKey = rsaEncrypt(aesKey, publicKeyPem);

        // Step 4: Decrypt the AES key with RSA private key
        const decryptedAesKey = rsaDecrypt(encryptedAesKey, privateKeyPem);

        // Step 5: Decrypt the data with the decrypted AES key
        const decryptedData = aesDecrypt(encryptedData, decryptedAesKey, aesIv);

        expect(decryptedData.toString()).to.equal(data.toString());
    });
});
