import { YoutubeTranscript } from "youtube-transcript";
import { extractSubtitlesViaYtdlp } from "./youtube";

export async function getYouTubeTranscript(
  videoId: string
): Promise<string | null> {
  console.log(`[Transcript] Fetching YouTube captions for ${videoId}...`);

  // METHOD 1: Try yt-dlp subtitle extraction FIRST (most reliable)
  console.log(`[Transcript] Method 1: Trying yt-dlp subtitle extraction...`);
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

  // METHOD 2: Try youtube-transcript package as fallback
  console.log(`[Transcript] Method 2: Trying youtube-transcript package...`);
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
