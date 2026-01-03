const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const https = require("https");

const execAsync = promisify(exec);

async function downloadFile(url, destination, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error("Too many redirects");
  }

  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url} (redirect count: ${redirectCount})`);

    https
      .get(url, (response) => {
        console.log(`Response status: ${response.statusCode}`);

        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          console.log(`Following redirect to: ${response.headers.location}`);
          downloadFile(
            response.headers.location,
            destination,
            redirectCount + 1
          )
            .then(resolve)
            .catch(reject);
        } else if (response.statusCode === 200) {
          const file = fs.createWriteStream(destination);
          let downloadedBytes = 0;

          response.on("data", (chunk) => {
            downloadedBytes += chunk.length;
          });

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            console.log(`Downloaded ${downloadedBytes} bytes`);
            resolve();
          });

          file.on("error", (err) => {
            fs.unlink(destination, () => {});
            reject(err);
          });
        } else {
          reject(new Error(`Unexpected status code: ${response.statusCode}`));
        }
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function installYtDlp() {
  // Skip on Windows (development)
  if (process.platform === "win32") {
    console.log("Skipping yt-dlp installation on Windows");
    return;
  }

  console.log("Downloading yt-dlp binary for Linux/Vercel...");

  try {
    const binDir = path.join(__dirname, "..", "bin");

    // Create bin directory if it doesn't exist
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
      console.log("Created bin directory:", binDir);
    }

    const ytdlpPath = path.join(binDir, "yt-dlp");

    // Download yt-dlp STANDALONE binary for Linux (not the Python script)
    console.log("Downloading NIGHTLY build from GitHub (latest fixes)...");
    await downloadFile(
      "https://github.com/yt-dlp/yt-dlp/releases/download/nightly/yt-dlp_linux",
      ytdlpPath
    );

    // Check file size
    const stats = fs.statSync(ytdlpPath);
    console.log(`Downloaded file size: ${stats.size} bytes`);

    if (stats.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    // Make it executable
    fs.chmodSync(ytdlpPath, 0o755);

    console.log("yt-dlp downloaded successfully to:", ytdlpPath);

    // Verify it works
    const { stdout } = await execAsync(`"${ytdlpPath}" --version`);
    console.log("yt-dlp version:", stdout.trim());
  } catch (error) {
    console.error("Failed to install yt-dlp:", error);
    throw error; // Fail the build if yt-dlp can't be installed
  }
}

installYtDlp();
