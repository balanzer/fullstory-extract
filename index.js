const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("./")); // Serve index.html

const DOWNLOADS_DIR = path.join(__dirname, "downloads");
const LOG_FILE = path.join(__dirname, "status.txt");

// API to save to txt file
app.get("/clear-log", (req, res) => {
  fs.writeFileSync(LOG_FILE, "");
  res.send("Log cleared");
});

app.post("/save-log", (req, res) => {
  fs.appendFileSync(LOG_FILE, req.body.data);
  res.send("Logged");
});

// API to download and unzip
app.post("/download", async (req, res) => {
  const { url, prefix } = req.body;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const folderPath = path.join(DOWNLOADS_DIR, `${prefix}_${timestamp}`);

  await fs.ensureDir(folderPath);

  const zipPath = path.join(folderPath, "data.zip");
  const response = await axios({ url, responseType: "arraybuffer" });
  fs.writeFileSync(zipPath, response.data);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(folderPath, true);

  res.send("Downloaded and Extracted");
});

app.post("/clear-downloads", async (req, res) => {
  await fs.emptyDir(DOWNLOADS_DIR);
  res.send("Cleared");
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
