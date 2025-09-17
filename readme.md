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

## Process Flow

![Process Flow](public/images/keypair-file-vault-flowchart.svg)