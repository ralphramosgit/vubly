import { YoutubeTranscript } from "youtube-transcript";
import { extractSubtitlesViaYtdlp } from "./youtube";
import { extractCaptionsDirectly } from "./direct-caption";

export async function getYouTubeTranscript(
  videoId: string
): Promise<string | null> {
  console.log(`[Transcript] Fetching YouTube captions for ${videoId}...`);

  // METHOD 1: Try direct HTML parsing FIRST (most reliable, no dependencies)
  console.log(`[Transcript] Method 1: Trying direct HTML caption extraction...`);
  try {
    const directTranscript = await extractCaptionsDirectly(videoId);
    if (directTranscript && directTranscript.length > 50) {
      console.log(
        `[Transcript] ✅ Direct extraction succeeded! (${directTranscript.length} chars)`
      );
      return directTranscript;
    }
  } catch (error) {
    console.log(
      `[Transcript] Direct extraction failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }

  // METHOD 2: Try yt-dlp subtitle extraction
  console.log(`[Transcript] Method 2: Trying yt-dlp subtitle extraction...`);
  try {
    const ytdlpTranscript = await extractSubtitlesViaYtdlp(videoId);
    if (ytdlpTranscript && ytdlpTranscript.length > 50) {
      console.log(
        `[Transcript] ✅ yt-dlp subtitle extraction succeeded! (${ytdlpTranscript.length} chars)`
      );
      return ytdlpTranscript;
    }
  } catch (error) {
    console.log(
      `[Transcript] yt-dlp subtitle extraction failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }

  // METHOD 3: Try youtube-transcript package as final fallback
  console.log(`[Transcript] Method 3: Trying youtube-transcript package...`);
  const languagesToTry = [undefined, "en", "en-US", "en-GB"];

  for (const lang of languagesToTry) {
    try {
      console.log(
        `[Transcript] Attempting with ${lang ? `language: ${lang}` : "auto-detect"}...`
      );

      const config = lang ? { lang } : {};
      const transcriptData = await YoutubeTranscript.fetchTranscript(
        videoId,
        config
      );

      if (transcriptData && transcriptData.length > 0) {
        const fullTranscript = transcriptData
          .map((segment) => segment.text)
          .join(" ")
          .trim();

        if (fullTranscript.length > 50) {
          console.log(
            `[Transcript] ✅ youtube-transcript succeeded! (${fullTranscript.length} chars)`
          );
          return fullTranscript;
        }
      }
    } catch (error) {
      console.log(
        `[Transcript] youtube-transcript failed with ${lang || "auto"}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.error(`[Transcript] ❌ All transcript methods exhausted`);
  return null;
}
