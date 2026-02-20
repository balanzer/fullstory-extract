const express = require("express");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const AdmZip = require("adm-zip");
const cors = require("cors");
const zlib = require("zlib");

const app = express();
const SERVER_URL = "http://localhost:3010";
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
const STATUS_EXPORT_FILE = path.join(DOWNLOADS_DIR, "status_export.txt");
const STATUS_LOCATION_FILE = path.join(DOWNLOADS_DIR, "status_location.txt");
const URLS_FILE = path.join(DOWNLOADS_DIR, "urls.txt");
const DOM_FILE = path.join(DOWNLOADS_DIR, "dom_content.txt");

// Ensure directory exists
fs.ensureDirSync(DOWNLOADS_DIR);

async function downloadAndExtractGzip(url) {
  // 1. Generate the prefix: YYYY-MM-DD_HH-mm-ss
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .split(".")[0];
  const fileName = `${timestamp}_data.csv`;
  const dirPath = path.join(DOWNLOADS_DIR, "extract");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created at: ${dirPath}`);
  } else {
    console.log("Directory already exists.");
  }
  const outputPath = path.join(dirPath, fileName);

  try {
    console.log(`Starting download: ${fileName}..., Locaton: ${url}`);

    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream", // Critical: handle data as a stream
    });

    // 2. Create the pipeline: Download -> Gunzip -> Write to File
    const writer = fs.createWriteStream(outputPath);
    const gunzip = zlib.createGunzip();

    response.data
      .pipe(gunzip) // Decompress the .gz chunk by chunk
      .pipe(writer); // Save the extracted JSON chunk by chunk

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`Successfully extracted to: ${outputPath}`);
        resolve(outputPath);
      });
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Extraction failed:", error.message);
    throw error;
  }
}

app.get("/api/download", async (req, res) => {
  try {
    const res = await axios.post(`${SERVER_URL}/get-location-urls`);
    const urls = res.data.urls; // Array of IDs from status.txt
    console.log("URLs to download:", urls);
    for (const url of urls) {
      const path = await downloadAndExtractGzip(url);
    }
    res.json({ status: "success" });
  } catch (err) {
    console.error("Download API error:", err.message);
    res.status(500).send(err.message);
  }
});

// Step 1 helper
app.post("/save-id", (req, res) => {
  const content = `${req.body.type},${req.body.id}`;
  fs.appendFileSync(STATUS_FILE, content + "\n");
  res.send("Saved");
});

app.post("/save-export-id", (req, res) => {
  const content = `${req.body.id}`;
  fs.appendFileSync(STATUS_EXPORT_FILE, content + "\n");
  res.send("Saved");
});

app.post("/save-location-urls", (req, res) => {
  const content = `${req.body.url}`;
  fs.appendFileSync(STATUS_LOCATION_FILE, content + "\n");
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
app.post("/get-export-ids", (req, res) => {
  try {
    if (!fs.existsSync(STATUS_EXPORT_FILE)) {
      return res.json({ ids: [] });
    }

    // Read the file, split by newline, and filter out any empty strings
    const ids = fs
      .readFileSync(STATUS_EXPORT_FILE, "utf-8")
      .split("\n")
      .map((id) => id.trim()) // Get only the ID part
      .filter(Boolean);

    res.json({ ids });
  } catch (error) {
    console.error("Error reading status_export.txt:", error);
    res.status(500).json({ error: "Could not read status file." });
  }
});

app.post("/get-location-urls", (req, res) => {
  try {
    if (!fs.existsSync(STATUS_LOCATION_FILE)) {
      return res.json({ ids: [] });
    }

    // Read the file, split by newline, and filter out any empty strings
    const urls = fs
      .readFileSync(STATUS_LOCATION_FILE, "utf-8")
      .split("\n")
      .map((url) => url.trim()) // Get only the ID part
      .filter(Boolean);

    res.json({ urls });
  } catch (error) {
    console.error("Error reading status_location.txt:", error);
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

const Papa = require("papaparse");

app.post("/analyze-csvs", async (req, res) => {
  const { folderPath } = req.body;

  try {
    if (!fs.existsSync(folderPath)) {
      return res.status(404).send("Folder path does not exist.");
    }

    const files = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".csv"));
    if (files.length === 0) {
      return res.status(400).send("No CSV files found.");
    }

    let combinedColumns = {}; // Key: Column Name, Value: { file: string, samples: Set }

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const csvData = fs.readFileSync(filePath, "utf8");

      const results = Papa.parse(csvData, {
        header: true,
        preview: 50, // Preview more rows to ensure we find 5 unique samples
        skipEmptyLines: true,
      });

      const headers = results.meta.fields;

      headers.forEach((header) => {
        // If column is new, initialize it with the current filename
        if (!combinedColumns[header]) {
          combinedColumns[header] = {
            file: file,
            samples: new Set(),
          };
        }

        // Collect unique samples until we hit the limit of 5
        for (const row of results.data) {
          const val = row[header];
          if (
            val !== undefined &&
            val !== null &&
            val !== "" &&
            combinedColumns[header].samples.size < 5
          ) {
            combinedColumns[header].samples.add(val);
          }
          if (combinedColumns[header].samples.size >= 5) break;
        }
      });
    }

    // Convert the object into a flat array for the frontend table
    const finalOutput = Object.keys(combinedColumns).map((colName) => ({
      fileName: combinedColumns[colName].file,
      columnName: colName,
      samples: Array.from(combinedColumns[colName].samples),
    }));

    res.json(finalOutput);
  } catch (error) {
    res.status(500).send(error.message);
  }
});
