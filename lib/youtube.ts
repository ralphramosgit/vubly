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

// Extract subtitles/captions using yt-dlp (different endpoint than video download)
export async function extractSubtitlesViaYtdlp(
  videoId: string
): Promise<string | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tempDir = os.tmpdir();
  const outputBase = path.join(tempDir, `${videoId}_subs`);

  console.log(`[Subtitles] Extracting subtitles for ${videoId} via yt-dlp...`);

  // Try multiple strategies for subtitle extraction
  const strategies = [
    // Strategy 1: Auto-generated subtitles with vtt format
    {
      name: "auto-sub-vtt",
      args: `--skip-download --write-auto-sub --sub-lang "en.*" --sub-format vtt --convert-subs vtt`,
    },
    // Strategy 2: Manual subtitles
    {
      name: "manual-sub",
      args: `--skip-download --write-sub --sub-lang "en.*" --sub-format vtt --convert-subs vtt`,
    },
    // Strategy 3: Any available subtitles
    {
      name: "any-sub",
      args: `--skip-download --write-auto-sub --write-sub --sub-lang "en,en-US,en-GB,en-orig" --sub-format vtt`,
    },
    // Strategy 4: List available subtitles first
    {
      name: "all-subs",
      args: `--skip-download --all-subs --sub-format vtt`,
    },
  ];

  for (const strategy of strategies) {
    console.log(`[Subtitles] Trying strategy: ${strategy.name}`);

    try {
      // Clean up any existing subtitle files
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        if (
          file.startsWith(`${videoId}_subs`) &&
          (file.endsWith(".vtt") ||
            file.endsWith(".srt") ||
            file.endsWith(".json"))
        ) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      }

      const command = `${ytdlpPath} ${strategy.args} -o "${outputBase}" "${url}"`;
      console.log(`[Subtitles] Running: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000,
      });

      console.log(`[Subtitles] stdout: ${stdout}`);
      if (stderr) console.log(`[Subtitles] stderr: ${stderr}`);

      // Look for downloaded subtitle files
      const subtitleFiles = fs.readdirSync(tempDir).filter((f) => {
        return (
          f.startsWith(`${videoId}_subs`) &&
          (f.endsWith(".vtt") || f.endsWith(".srt"))
        );
      });

      console.log(`[Subtitles] Found subtitle files:`, subtitleFiles);

      if (subtitleFiles.length > 0) {
        // Read the first subtitle file found
        const subPath = path.join(tempDir, subtitleFiles[0]);
        const content = fs.readFileSync(subPath, "utf-8");

        // Parse VTT/SRT and extract text
        const transcript = parseSubtitleFile(content);

        // Cleanup
        for (const f of subtitleFiles) {
          try {
            fs.unlinkSync(path.join(tempDir, f));
          } catch {}
        }

        if (transcript && transcript.length > 50) {
          console.log(
            `[Subtitles] ✅ Successfully extracted ${transcript.length} chars of transcript`
          );
          return transcript;
        }
      }
    } catch (error) {
      console.log(
        `[Subtitles] Strategy ${strategy.name} failed:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log(`[Subtitles] ❌ All subtitle extraction strategies failed`);
  return null;
}

function parseSubtitleFile(content: string): string {
  // Remove VTT header and metadata
  let text = content
    .replace(/^WEBVTT[\s\S]*?\n\n/, "") // Remove VTT header
    .replace(/^\d+\n/gm, "") // Remove SRT sequence numbers
    .replace(
      /\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/g,
      ""
    ) // Remove timestamps
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/\{[^}]+\}/g, "") // Remove style tags
    .replace(/\n{2,}/g, " ") // Replace multiple newlines with space
    .replace(/\n/g, " ") // Replace single newlines with space
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  return text;
}

export async function downloadAudio(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`[Audio] Using cobalt.tools API for ${videoId}...`);

  try {
    const buffer = await downloadViaCobalt(videoId, "audio");
    console.log(`[Audio] Cobalt.tools succeeded!`);
    return buffer;
  } catch (cobaltError) {
    console.error(
      "[Audio] Cobalt.tools failed:",
      cobaltError instanceof Error ? cobaltError.message : String(cobaltError)
    );
    console.error("[Audio] Cobalt.tools full error:", cobaltError);
    // Fallback to yt-dlp as last resort
    console.log("[Audio] Falling back to yt-dlp...");
    return await downloadAudioViaYtdlp(videoId);
  }
}

async function downloadAudioViaYtdlp(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `${videoId}_audio.mp3`);

  console.log("[Audio] Trying yt-dlp as fallback...");

  try {
    await execAsync(
      `${ytdlpPath}${ffmpegLocation} --extractor-args "youtube:player_client=web;player_skip=configs,js" --no-check-certificates -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`,
      { maxBuffer: 50 * 1024 * 1024, timeout: 120000 }
    );

    if (fs.existsSync(outputPath)) {
      const audioBuffer = fs.readFileSync(outputPath);
      try {
        fs.unlinkSync(outputPath);
      } catch {
        console.warn(`Failed to cleanup temp audio file: ${outputPath}`);
      }
      return audioBuffer;
    }

    throw new Error("Audio file not created");
  } catch (error: unknown) {
    // Cleanup
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch {}

    throw new Error(
      `Failed to download audio: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function downloadViaCobalt(
  videoId: string,
  type: "audio" | "video"
): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`[Cobalt] Requesting ${type} download for ${videoId}...`);
  console.log(`[Cobalt] URL: ${url}`);

  const requestBody = {
    url: url,
    videoQuality: "720",
    audioFormat: "mp3",
    filenameStyle: "basic",
    downloadMode: type === "audio" ? "audio" : "auto",
  };

  console.log(`[Cobalt] Request body:`, JSON.stringify(requestBody));

  // Use cobalt.tools v10 API
  const response = await fetch("https://api.cobalt.tools/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`[Cobalt] Response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Cobalt] HTTP error response:`, errorText);
    throw new Error(`Cobalt API HTTP error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[Cobalt] Response data:`, JSON.stringify(data));

  if (data.status === "error" || data.status === "rate-limit") {
    throw new Error(
      `Cobalt API error: ${data.error?.code || data.text || JSON.stringify(data)}`
    );
  }

  // Get the download URL from v10 API response
  const fileUrl = data.url;
  if (!fileUrl) {
    throw new Error(
      `Cobalt API did not return a download URL. Full response: ${JSON.stringify(data)}`
    );
  }

  console.log(`[Cobalt] Downloading from: ${fileUrl}`);

  const fileResponse = await fetch(fileUrl);
  console.log(`[Cobalt] File download status: ${fileResponse.status}`);

  if (!fileResponse.ok) {
    throw new Error(
      `Failed to download from cobalt: ${fileResponse.status} ${fileResponse.statusText}`
    );
  }

  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  console.log(`[Cobalt] Downloaded ${buffer.length} bytes`);

  return buffer;
}

export async function downloadVideo(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`[Video] Using cobalt.tools API for ${videoId}...`);

  try {
    return await downloadViaCobalt(videoId, "video");
  } catch (cobaltError) {
    console.error("[Video] Cobalt.tools failed:", cobaltError);
    // Fallback to yt-dlp
    return await downloadVideoViaYtdlp(videoId);
  }
}

async function downloadVideoViaYtdlp(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `${videoId}_video.mp4`);

  console.log("[Video] Trying yt-dlp as fallback...");

  try {
    await execAsync(
      `${ytdlpPath}${ffmpegLocation} --extractor-args "youtube:player_client=web;player_skip=configs,js" --no-check-certificates -f "bestvideo[ext=mp4]/best[ext=mp4]" -o "${outputPath}" "${url}"`,
      { maxBuffer: 100 * 1024 * 1024, timeout: 120000 }
    );

    if (fs.existsSync(outputPath)) {
      const videoBuffer = fs.readFileSync(outputPath);
      try {
        fs.unlinkSync(outputPath);
      } catch {
        console.warn(`Failed to cleanup temp video file: ${outputPath}`);
      }
      return videoBuffer;
    }

    throw new Error("Video file not created");
  } catch (error: unknown) {
    // Cleanup
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch {}

    throw new Error(
      `Failed to download video: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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
