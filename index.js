const express = require("express");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const AdmZip = require("adm-zip");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["POST"], // Tell the browser we only want POST
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.static("./"));

const DOWNLOADS_DIR = path.join(__dirname, "downloads");
const STATUS_FILE = path.join(DOWNLOADS_DIR, "status.txt");
const URLS_FILE = path.join(DOWNLOADS_DIR, "urls.txt");
const DOM_FILE = path.join(DOWNLOADS_DIR, "dom_content.txt");

// Ensure directory exists
fs.ensureDirSync(DOWNLOADS_DIR);

// Step 1 helper
app.post("/save-id", (req, res) => {
  const content = `${req.body.type},${req.body.id}`;
  fs.appendFileSync(STATUS_FILE, content + "\n");
  res.send("Saved");
});

app.post("/get-ids", (req, res) => {
  try {
    if (!fs.existsSync(STATUS_FILE)) {
      return res.json({ ids: [] });
    }

    // Read the file, split by newline, and filter out any empty strings
    const ids = fs
      .readFileSync(STATUS_FILE, "utf-8")
      .split("\n")
      .map((id) => id.trim().split(",")[1]) // Get only the ID part
      .filter(Boolean);

    res.json({ ids });
  } catch (error) {
    console.error("Error reading status.txt:", error);
    res.status(500).json({ error: "Could not read status file." });
  }
});

// Step 2 Logic
app.post("/step-check-status", async (req, res) => {
  if (!fs.existsSync(STATUS_FILE))
    return res.status(400).json({ message: "No status.txt found" });
  const ids = fs.readFileSync(STATUS_FILE, "utf-8").split("\n").filter(Boolean);
  // In a real app, you'd loop and call your Status API here
  res.json({ message: `Verified ${ids.length} jobs. Ready for Step 3.` });
});

// Step 3 Logic
app.post("/step-generate-urls", (req, res) => {
  const ids = fs.readFileSync(STATUS_FILE, "utf-8").split("\n").filter(Boolean);
  const urls = ids.map((id) => `https://api.example.com/download/${id}`);
  fs.writeFileSync(URLS_FILE, urls.join("\n"));
  res.json({ message: "URLs generated in downloads/urls.txt" });
});

// Step 4 Logic
app.post("/step-download", async (req, res) => {
  const urls = fs.readFileSync(URLS_FILE, "utf-8").split("\n").filter(Boolean);
  for (const url of urls) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const folderPath = path.join(DOWNLOADS_DIR, `Download_${timestamp}`);
    await fs.ensureDir(folderPath);

    // Mock Download (Replace with actual axios call for zip)
    const zipPath = path.join(folderPath, "data.zip");
    fs.writeFileSync(zipPath, "Fake Zip Content");

    // If it were a real zip:
    // const zip = new AdmZip(zipPath); zip.extractAllTo(folderPath, true);
  }
  res.json({ message: "All files processed." });
});

// DOM Extractor with 10s wait
app.post("/extract-dom", async (req, res) => {
  const { url } = req.body;
  setTimeout(async () => {
    try {
      const response = await axios.get(url);
      fs.writeFileSync(DOM_FILE, response.data);
      console.log("DOM Saved");
    } catch (e) {
      console.log("DOM Fail", e.message);
    }
  }, 10000);
  res.json({ message: "Extraction started. Check folder in 10s." });
});

app.post("/clear-all", async (req, res) => {
  await fs.emptyDir(DOWNLOADS_DIR);
  res.send("Cleared");
});

app.listen(3010, () => console.log("Server running on http://localhost:3010"));
