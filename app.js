const SERVER_URL = "http://localhost:3000";
const types = ["TypeA", "TypeB"];
const eventDetails = ["Detail1", "Detail2"];

function updateLog(msg, isError = false) {
  const win = document.getElementById("status-window");
  const entry = document.createElement("div");
  entry.className = `log-entry ${isError ? "error" : "success"}`;
  entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  win.appendChild(entry);
  win.scrollTop = win.scrollHeight;
}

// STEP 1: Export
async function runStep1() {
  updateLog("Starting Step 1: Exporting jobs...");
  for (const type of types) {
    for (const detail of eventDetails) {
      try {
        // Example API call with Auth
        const response = await axios.post(
          "https://api.example.com/export",
          { type, detail },
          { auth: { username: "user", password: "password" } },
        );

        const jobId =
          response.data.id || `JOB_${Math.floor(Math.random() * 1000)}`;
        await axios.post(`${SERVER_URL}/save-id`, { id: jobId });
        updateLog(`Export Created: ${jobId} (${type})`);
      } catch (err) {
        updateLog(`Step 1 Error: ${err.message}`, true);
      }
    }
  }
}

// STEP 2: Check Status
async function runStep2() {
  updateLog("Starting Step 2: Checking status...");
  try {
    const res = await axios.post(`${SERVER_URL}/step-check-status`);
    updateLog(res.data.message);
  } catch (err) {
    updateLog(err.message, true);
  }
}

// STEP 3: Generate URLs
async function runStep3() {
  updateLog("Starting Step 3: Generating URLs...");
  try {
    const res = await axios.post(`${SERVER_URL}/step-generate-urls`);
    updateLog(res.data.message);
  } catch (err) {
    updateLog(err.message, true);
  }
}

// STEP 4: Download
async function runStep4() {
  updateLog("Starting Step 4: Downloading files...");
  try {
    const res = await axios.post(`${SERVER_URL}/step-download`);
    updateLog(res.data.message);
  } catch (err) {
    updateLog(err.message, true);
  }
}

// DOM Extractor
async function extractDOM() {
  const url = document.getElementById("dom-url").value;
  if (!url) return alert("Enter a URL");
  updateLog(`Requesting DOM for ${url}. Waiting 10s...`);
  try {
    const res = await axios.post(`${SERVER_URL}/extract-dom`, { url });
    updateLog(res.data.message);
  } catch (err) {
    updateLog(err.message, true);
  }
}

async function clearData() {
  await axios.post(`${SERVER_URL}/clear-all`);
  document.getElementById("status-window").innerHTML =
    '<div class="log-entry">Folders cleared.</div>';
}
