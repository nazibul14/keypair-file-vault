const path = require("path");
const fs = require("fs");
const request = require("supertest");
const { expect } = require("chai");

// Import your express app (the one where routes are mounted)
const app = require("../../app");

// helpers to locate the uploaded test file
const testFilePath = path.join(__dirname, "../fixtures/testfile.txt");

describe("Files API Integration", () => {
    let publicKey, privateKey;

    it("should upload a file", async () => {
        // Create a sample file for upload
        fs.writeFileSync(testFilePath, "keypait-file-valut integration test file");

        const res = await request(app)
            .post("/files")
            .attach("file", testFilePath);

        expect(res.status).to.equal(200);
        expect(res.body).to.have.property("publicKey");
        expect(res.body).to.have.property("privateKey");

        publicKey = res.body.publicKey;
        privateKey = res.body.privateKey;
    });

    it("should download the file", async () => {
        const res = await request(app)
            .get(`/files/${publicKey}`)
            .expect(200);

        // if encryption disabled, res.text === file contents
        expect(res.headers["content-type"]).to.match(/text|application/);
        expect(res.headers["content-disposition"]).to.include("attachment");
        expect(res.text).to.contain("keypait-file-valut");
    });

    it("should delete the file", async () => {
        const res = await request(app)
            .delete(`/files/${privateKey}`)
            .expect(200);

        expect(res.body.message).to.equal("File deleted successfully");
    });

    it("should return 404 for deleted file", async () => {
        await request(app)
            .get(`/files/${publicKey}`)
            .expect(404);
    });
});
