const SERVER_URL = "http://localhost:3010";

function updateLog(msg, isError = false) {
  const win = document.getElementById("status-window");
  const entry = document.createElement("div");
  entry.className = `log-entry ${isError ? "error" : "success"}`;
  entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  win.appendChild(entry);
  win.scrollTop = win.scrollHeight;
  console.log(msg);
}

const eventDetails = ["SCOPE_EVENTS"];

const authToken =
  "na1.MTVERTNIL211cmFsaXRoYXJhbi52YXJhdGhhcmFqYW5AaWhnLmNvbTph+VkGp7A3NZGJgH3HaYLcCHsjzy1flFgz8wQDSyXtAS4u/1VEYBT3";

// STEP 1: Export
async function runStep1() {
  updateLog("Starting Step 1: Exporting jobs...");
  const url = "https://api.fullstory.com/segments/v1/exports";
  try {
    updateLog("Starting Step 1a: Exporting individual data...");

    const requetBody = {
      segmentId: "Ulsl7U9qLZSx",
      type: "TYPE_INDIVIDUAL",
      format: "FORMAT_JSON",
      timeRange: {
        start: "2025-02-01T00:00:00Z",
        end: "2026-02-19T00:00:00Z",
      },
      segmentTimeRange: {
        start: "2025-02-01T00:00:00Z",
        end: "2026-02-19T00:00:00Z",
      },
    };

    const response = await axios.post(url, requetBody, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authToken}`,
      },
    });

    //updateLog(`response : ${JSON.stringify(response.data)}`);
    const jobId = response.data.operationId;
    updateLog(`response : ${jobId}`);
    await axios.post(`${SERVER_URL}/save-id`, {
      id: jobId,
      type: "TYPE_INDIVIDUAL",
    });
    //updateLog(`Export Created: ${jobId}`);
  } catch (err) {
    updateLog(`Step 1 Error: ${err.message}`, true);
  }

  updateLog("Starting Step 1b: Exporting events data...");

  for (const detail of eventDetails) {
    const requetBody = {
      segmentId: "Ulsl7U9qLZSx",
      type: "TYPE_EVENT",
      format: "FORMAT_JSON",
      timeRange: {
        start: "2025-02-01T00:00:00Z",
        end: "2026-02-19T00:00:00Z",
      },
      segmentTimeRange: {
        start: "2025-02-01T00:00:00Z",
        end: "2026-02-19T00:00:00Z",
      },
      eventDetails: {
        scope: detail,
      },
    };

    try {
      const response = await axios.post(url, requetBody, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${authToken}`,
        },
      });

      //updateLog(`response : ${JSON.stringify(response.data)}`);
      const jobId = response.data.operationId;
      updateLog(`response : ${jobId}`);
      await axios.post(`${SERVER_URL}/save-id`, {
        id: jobId,
        type: `TYPE_EVENT_${detail}`,
      });
      //updateLog(`Export Created: ${jobId}`);
    } catch (err) {
      updateLog(`Step 1 Error: ${err.message}`, true);
    }
  }
}

// STEP 2: Check Status
let pendingJobs = []; // To track jobs that aren't finished yet
let failedJobs = [];
async function runStep2() {
  updateLog("Starting Step 2: Continuous Status Check (Every 30s)...", "blue");

  try {
    // 1. Fetch the list of IDs from your local server
    const res = await axios.post(`${SERVER_URL}/get-ids`);
    pendingJobs = res.data.ids; // Array of IDs from status.txt
    console.log("Pending Jobs:", pendingJobs);
    if (pendingJobs.length === 0) {
      updateLog("No jobs found in status.txt to process.", "error");
      return;
    }

    // 2. Start the interval
    const pollInterval = setInterval(async () => {
      updateLog(`Checking status for ${pendingJobs.length} pending jobs...`);
      updateLog(`Skipping status for ${failedJobs.length} failed jobs...`);

      const finishedThisRound = [];

      for (const jobId of pendingJobs) {
        try {
          // Call the FullStory Export Status API
          const url = `https://api.fullstory.com/operations/v1/${jobId}`;
          const response = await axios.get(url, {
            headers: {
              Authorization: `Basic ${authToken}`,
            },
          });

          const status = response.status;
          /*
          console.log(
            `Status for Job ${jobId} status: ${status}, response data: ${JSON.stringify(response.data, null, 2)}`,
          ); */

          const completeStatus = response.data.estimatePctComplete;

          updateLog(
            `Job: ${jobId} | HTTP: ${status} | Progress: ${completeStatus}%`,
          );

          // 3. If complete, mark for removal from pending list
          if (completeStatus === 100) {
            const searchExportId = response.data.results.searchExportId;
            finishedThisRound.push(jobId);
            console.log(
              `Job ${jobId} is complete. Search Export ID: ${searchExportId}`,
            );
            await axios.post(`${SERVER_URL}/save-export-id`, {
              id: searchExportId,
            });
          }
        } catch (err) {
          updateLog(`Error checking Job ${jobId}: ${err.message}`, "error");
          failedJobs.push(jobId); // Track failed jobs
        }
      }

      // Remove finished jobs from the pending list
      pendingJobs = pendingJobs.filter((id) => !finishedThisRound.includes(id));
      // Remove finished jobs from the failed list
      pendingJobs = pendingJobs.filter((id) => !failedJobs.includes(id));
      // 4. Check if we are done
      if (pendingJobs.length === 0) {
        clearInterval(pollInterval);
        updateLog(
          "✅ All jobs processed successfully with 100% completion.",
          "success",
        );
      }
    }, 5000); // 30 Seconds
  } catch (err) {
    updateLog("Failed to initiate Step 2: " + err.message, "error");
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
