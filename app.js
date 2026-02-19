const types = ["TypeA", "TypeB"];
const eventDetails = ["Detail1", "Detail2"];

async function updateUI(message, className = "") {
  const container = document.getElementById("status-container");
  const msg = document.createElement("p");
  msg.className = className;
  msg.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

async function extractDOM() {
  const url = document.getElementById("target-url").value;
  if (!url) return alert("Please enter a URL");

  updateUI(`Requesting DOM for: ${url}...`, "progress");

  try {
    const response = await fetch("http://localhost:3000/extract-dom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const result = await response.text();
    updateUI(result, "completed");
  } catch (err) {
    updateUI(`Extraction failed: ${err.message}`, "error");
  }
}

async function startJob() {
  updateUI("Starting Export Job... Clearing log file.", "progress");

  // Clear log via backend
  await fetch("http://localhost:3000/clear-log");

  for (const type of types) {
    for (const detail of eventDetails) {
      try {
        const jobName = `${type}_${detail}`;

        // 1. Export Job
        updateUI(`Step 1: Exporting ${jobName}...`);
        const exportRes = await axios.post("YOUR_EXPORT_API_URL", {
          type,
          detail,
        });
        const jobId = exportRes.data.id;
        await axios.post("http://localhost:3000/save-log", {
          data: `Started: ${jobName} ID: ${jobId}\n`,
        });

        // 2. Query Status (Polling)
        let isComplete = false;
        while (!isComplete) {
          updateUI(`Step 2: Checking status for ${jobId}...`);
          const statusRes = await axios.get(`YOUR_STATUS_API_URL/${jobId}`);
          if (statusRes.data.status === "COMPLETED") {
            isComplete = true;
          } else {
            updateUI(`In progress... waiting 60s`, "progress");
            await new Promise((r) => setTimeout(r, 60000));
          }
        }

        // 3. Get Download Location
        updateUI(`Step 3: Fetching download URL...`);
        const locRes = await axios.get(`YOUR_DOWNLOAD_LOC_API/${jobId}`);
        const downloadUrl = locRes.data.url;

        // 4. Download and Extract
        updateUI(`Step 4: Downloading to timestamped folder...`, "completed");
        await fetch("http://localhost:3000/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: downloadUrl, prefix: jobName }),
        });
      } catch (err) {
        updateUI(`Error processing ${type}: ${err.message}`, "error");
      }
    }
  }
}

async function clearDownloads() {
  await fetch("http://localhost:3000/clear-downloads", { method: "POST" });
  alert("Downloads folder cleared!");
}
