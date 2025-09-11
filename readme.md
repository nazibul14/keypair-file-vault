# KeyPair File Vault

A secure REST API server for uploading, downloading, and deleting files using **public/private key pairs**.  
Files are stored in a configurable local folder (or pluggable cloud storage provider) and are automatically cleaned up after inactivity.

---

## ✨ Features

- `POST /files` – Upload a file; returns `publicKey` & `privateKey` in JSON.
- `GET /files/:publicKey` – Download a file by its `publicKey`.
- `DELETE /files/:privateKey` – Delete a file by its `privateKey`.
- Pluggable storage backend: local (default) or cloud providers (GCS, Azure, AWS).
- Configurable per-IP daily upload/download limits.
- Automatic cleanup of inactive files via internal job.
- Full unit & integration test coverage.

---

## 📦 Installation

```bash
git clone https://github.com/<your-username>/keypair-file-vault.git
cd keypair-file-vault
npm install   # or yarn install
