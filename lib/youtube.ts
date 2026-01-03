import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Detect environment and use appropriate paths
const isWindows = os.platform() === "win32";

let ytdlpPath: string;
let ffmpegLocation: string;

if (isWindows) {
  // Local Windows development - with quotes for spaces in path
  ytdlpPath = `"C:\\Users\\ralph\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe"`;
  ffmpegLocation = ` --ffmpeg-location "C:\\Users\\ralph\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin"`;
} else {
  // Linux/Vercel production - use downloaded binary
  const binaryPath = path.join(process.cwd(), "bin", "yt-dlp");
  ytdlpPath = `"${binaryPath}"`;
  ffmpegLocation = ""; // System ffmpeg
  console.log("Using yt-dlp binary at:", binaryPath);
  console.log("Binary exists:", fs.existsSync(binaryPath));
  if (fs.existsSync(binaryPath)) {
    const stats = fs.statSync(binaryPath);
    console.log("Binary is executable:", (stats.mode & 0o111) !== 0);
    console.log("Binary size:", stats.size);
  }
}

console.log(`Platform: ${os.platform()}, yt-dlp path:`, ytdlpPath);

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function downloadAudio(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `${videoId}_audio.mp3`);

  // Try multiple strategies in order
  const strategies = [
    // Strategy 1: web client with service worker bypass (2025 method)
    `${ytdlpPath}${ffmpegLocation} --extractor-args "youtube:player_client=web;player_skip=configs,js" --no-check-certificates -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`,
    // Strategy 2: mweb client (mobile web)
    `${ytdlpPath}${ffmpegLocation} --extractor-args "youtube:player_client=mweb" --no-check-certificates -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`,
    // Strategy 3: android with testsuite
    `${ytdlpPath}${ffmpegLocation} --extractor-args "youtube:player_client=android_testsuite" --no-check-certificates -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`,
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`[Audio] Trying strategy ${i + 1}/${strategies.length}...`);
      await execAsync(strategies[i], {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 120000,
      });

      // Check if file exists
      if (fs.existsSync(outputPath)) {
        const audioBuffer = fs.readFileSync(outputPath);
        try {
          fs.unlinkSync(outputPath);
        } catch {
          console.warn(`Failed to cleanup temp audio file: ${outputPath}`);
        }
        console.log(`[Audio] Success with strategy ${i + 1}`);
        return audioBuffer;
      }
    } catch (error: unknown) {
      lastError = error as Error;
      console.warn(
        `[Audio] Strategy ${i + 1} failed:`,
        error instanceof Error ? error.message : String(error)
      );
      // Clean up and try next strategy
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch {}
    }
  }

  // All strategies failed
  console.error("yt-dlp audio download error - all strategies failed");
  throw new Error(
    `Failed to download audio after trying all strategies: ${lastError?.message || "Unknown error"}`
  );
}

export async function downloadVideo(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `${videoId}_video.mp4`);

  // Try multiple strategies in order
  const strategies = [
    // Strategy 1: web client with service worker bypass
    `${ytdlpPath}${ffmpegLocation} --extractor-args "youtube:player_client=web;player_skip=configs,js" --no-check-certificates -f "bestvideo[ext=mp4]/best[ext=mp4]" -o "${outputPath}" "${url}"`,
    // Strategy 2: mweb client
    `${ytdlpPath}${ffmpegLocation} --extractor-args "youtube:player_client=mweb" --no-check-certificates -f "bestvideo[ext=mp4]/best[ext=mp4]" -o "${outputPath}" "${url}"`,
    // Strategy 3: android testsuite
    `${ytdlpPath}${ffmpegLocation} --extractor-args "youtube:player_client=android_testsuite" --no-check-certificates -f "bestvideo[ext=mp4]/best[ext=mp4]" -o "${outputPath}" "${url}"`,
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`[Video] Trying strategy ${i + 1}/${strategies.length}...`);
      await execAsync(strategies[i], {
        maxBuffer: 100 * 1024 * 1024,
        timeout: 120000,
      });

      // Check if file exists
      if (fs.existsSync(outputPath)) {
        const videoBuffer = fs.readFileSync(outputPath);
        try {
          fs.unlinkSync(outputPath);
        } catch {
          console.warn(`Failed to cleanup temp video file: ${outputPath}`);
        }
        console.log(`[Video] Success with strategy ${i + 1}`);
        return videoBuffer;
      }
    } catch (error: unknown) {
      lastError = error as Error;
      console.warn(
        `[Video] Strategy ${i + 1} failed:`,
        error instanceof Error ? error.message : String(error)
      );
      // Clean up and try next strategy
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch {}
    }
  }

  // All strategies failed
  console.error("yt-dlp video download error - all strategies failed");
  throw new Error(
    `Failed to download video after trying all strategies: ${lastError?.message || "Unknown error"}`
  );
}

export async function getVideoInfo(videoId: string) {
  try {
    // Use YouTube Data API instead of yt-dlp (YouTube blocks yt-dlp)
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY not configured");
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YouTube API error response:", errorText);
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.error("Video not found for ID:", videoId);
      throw new Error("Video not found or is private");
    }

    const video = data.items[0];

    if (!video.snippet) {
      console.error("Video missing snippet data:", video);
      throw new Error("Video data incomplete");
    }

    // Parse ISO 8601 duration (PT1H2M3S) to seconds
    const duration = parseDuration(video.contentDetails?.duration || "PT0S");

    const videoInfo = {
      id: videoId,
      title: video.snippet.title || "Unknown Title",
      duration: duration,
      thumbnail:
        video.snippet.thumbnails?.high?.url ||
        video.snippet.thumbnails?.default?.url ||
        "",
      author: video.snippet.channelTitle || "Unknown Author",
    };

    console.log("Successfully fetched video info:", videoInfo);
    return videoInfo;
  } catch (error: unknown) {
    console.error("YouTube API error:", error);
    throw new Error(
      `Failed to get video info: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}
