const path = require("path");
const fs = require("fs");
const request = require("supertest");
const { expect } = require("chai");

// Import your express app (the one where routes are mounted)
const {app, cleanupTimer} = require("../../app");

// helpers to locate the uploaded test file
const testFilePath = path.join(__dirname, "../fixtures/testfile.txt");

describe("Files API Integration", () => {
    let publicKey, privateKey;
    let server;

    before(async () => {
        // console.log('before Files API Integration');
        // Start the server and store the instance
        server = app.listen(0); // Listen on a random available port
    });

    after(async () => {
        clearInterval(cleanupTimer)
        await new Promise(resolve => server.close(resolve));
        // Clean up the created test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
        // console.log('after Files API Integration');
    });

    it("should upload a file and get public key private key in json response", async () => {
        // Create a sample file for upload
        fs.writeFileSync(testFilePath, "keypait-file-valut integration test file");

        const res = await request(server)
            .post("/files")
            .attach("file", testFilePath);

        expect(res.status).to.equal(200);
        expect(res.body).to.have.property("publicKey");
        expect(res.body).to.have.property("privateKey");

        publicKey = res.body.publicKey;
        privateKey = res.body.privateKey;
    });

    it("should download the file", async () => {
        const res = await request(server)
            .get(`/files/${publicKey}`)
            .expect(200);

        // if encryption disabled, res.text === file contents
        expect(res.headers["content-type"]).to.match(/text|application/);
        expect(res.headers["content-disposition"]).to.include("attachment");
        expect(res.text).to.contain("keypait-file-valut");
    });

    it("should delete the file", async () => {
        const res = await request(server)
            .delete(`/files/${privateKey}`)
            .expect(200);

        expect(res.body.message).to.equal("File deleted successfully");
    });

    it("should return 404 for deleted file", async () => {
        await request(server)
            .get(`/files/${publicKey}`)
            .expect(404);
    });
});
