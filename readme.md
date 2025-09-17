# KeyPair File Vault

A REST API server for uploading, downloading, and deleting files using **public/private key pairs**.  
Files are stored in a configurable local folder  and are automatically cleaned up after inactivity.

---

## Features

- `POST /files` – Upload a file; returns `publicKey` & `privateKey` in JSON.
- `GET /files/:publicKey` – Download a file by its `publicKey`.
- `DELETE /files/:privateKey` – Delete a file by its `privateKey`.
- Configurable per-IP daily upload/download limits.
- Automatic cleanup of inactive files via internal job.
- Full unit & integration test coverage.

---

## Installation

```bash
git clone https://github.com/<your-username>/keypair-file-vault.git
cd keypair-file-vault
npm install  
```

---

## Setup

1. Copy the example env file:
   ```bash
   cp .env.example .env

2. Edit .env to suit your environment
3. Start the server:
    ```bash
   npm start
   ```
4. For testing:
    ```bash
   npm test
   ```
   
---

## Functional Steps

### 1. Upload (`POST /files`)

- **Check daily upload limit for request IP**
   - Limit reached → Return **429 JSON**: `{ "error": "Daily upload limit reached" }`
- **Receive file upload request**
- **Check if file is present**
   - No → Return **400 JSON**: `{ "error": "No file uploaded" }`
- **Read file buffer**
- **Generate a random private key**
- **Check if ENCRYPTION enabled**
   - Yes:
      - Generate RSA key pair
      - Generate AES key + IV
      - Encrypt file buffer with AES
      - Encrypt AES bundle with RSA public key
      - Build encrypted filename
   - No:
      - Generate publicKey
      - Build normal filename
- **Save file to storage**
- **Save metadata** (publicKey, privateKey, file info)
- **Delete temp uploaded file**
- **Return JSON:**
  ```json
  { "publicKey": "...", "privateKey": "..." }


### 2. Download (`GET /files/:publicKey`)

- **Check daily download limit for request IP**
   - Limit reached → Return **429 JSON**: `{ "error": "Daily download limit reached" }`
- **Receive file download request**
- **Get metadata by publicKey**
- **Check if meta exist**
   - No → Return **404 JSON**
- **Update** `lastDownloadedAt` **in meta**
- **Get file stream from storage**
- **If ENCRYPTION enabled**
   - Yes:
      - Decrypt AES bundle with RSA private key
      - Create decipher stream with AES key & IV
      - Pipe the encrypted file stream through decipher directly to HTTP response
   - No:
      - Pipe the file stream to HTTP response


### 3. Delete (`DELETE /files/:privateKey`)

- **Receive file delete request**
- **Get metadata by privateKey**
- **Check if meta exist**
    - No → Return **404 JSON**
- **Delete file from storage**
- **Delete meta record**
- **Return JSON:**
  ```json
  { message: "File deleted successfully" } 


![Process Flow](public/images/keypair-file-vault-flowchart.svg)