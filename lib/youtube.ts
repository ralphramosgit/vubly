import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Hardcode the yt-dlp path that we know exists
const ytdlpPath = `"C:\\Users\\ralph\\AppData\\Local\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe"`;
const ffmpegLocation = ` --ffmpeg-location "C:\\Users\\ralph\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin"`;

console.log(`Using yt-dlp: ${ytdlpPath}`);
console.log(`Using ffmpeg: ${ffmpegLocation}`);

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

  try {
    // Use yt-dlp to download audio only
    await execAsync(
      `${ytdlpPath}${ffmpegLocation} -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    // Check if file exists (yt-dlp might have created it)
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Audio file not created at ${outputPath}`);
    }

    const audioBuffer = fs.readFileSync(outputPath);

    // Clean up temp file
    fs.unlinkSync(outputPath);

    return audioBuffer;
  } catch (error: unknown) {
    console.error("yt-dlp audio download error:", error);
    throw new Error(`Failed to download audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function downloadVideo(videoId: string): Promise<Buffer> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `${videoId}_video.mp4`);

  try {
    // Use yt-dlp to download video (no audio, for syncing with translated audio)
    await execAsync(
      `${ytdlpPath}${ffmpegLocation} -f "bestvideo[ext=mp4]/best[ext=mp4]" -o "${outputPath}" "${url}"`,
      { maxBuffer: 100 * 1024 * 1024 }
    );

    // Check if file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Video file not created at ${outputPath}`);
    }

    const videoBuffer = fs.readFileSync(outputPath);

    // Clean up temp file
    fs.unlinkSync(outputPath);

    return videoBuffer;
  } catch (error: unknown) {
    console.error("yt-dlp video download error:", error);
    throw new Error(`Failed to download video: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getVideoInfo(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Use yt-dlp to get video info as JSON
    const { stdout } = await execAsync(
      `${ytdlpPath} --js-runtimes deno --dump-json --no-download "${url}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const info = JSON.parse(stdout);

    return {
      id: videoId,
      title: info.title || "Unknown Title",
      duration: info.duration || 0,
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || "",
      author: info.uploader || info.channel || "Unknown Author",
    };
  } catch (error: unknown) {
    console.error("yt-dlp info error:", error);
    throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : String(error)}`);
  }
}
