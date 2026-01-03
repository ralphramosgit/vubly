import { YoutubeTranscript } from "youtube-transcript";

export async function getYouTubeTranscript(
  videoId: string
): Promise<string | null> {
  console.log(`[Transcript] Fetching YouTube captions for ${videoId}...`);

  // Try multiple language codes and methods
  const languagesToTry = [
    undefined, // Auto-detect
    "en", // English
    "en-US", // English (US)
    "en-GB", // English (UK)
  ];

  for (const lang of languagesToTry) {
    try {
      console.log(
        `[Transcript] Attempting to fetch ${lang ? `with language: ${lang}` : "with auto-detect"}...`
      );

      const transcriptData = await YoutubeTranscript.fetchTranscript(
        videoId,
        lang ? { lang } : {}
      );

      if (!transcriptData || transcriptData.length === 0) {
        console.log(`[Transcript] No data returned for ${lang || "auto"}`);
        continue;
      }

      // Combine all transcript segments into full text
      const fullTranscript = transcriptData
        .map((segment) => segment.text)
        .join(" ")
        .trim();

      if (fullTranscript.length > 0) {
        console.log(
          `[Transcript] ✅ Successfully fetched transcript (${fullTranscript.length} chars): ${fullTranscript.substring(0, 100)}...`
        );
        return fullTranscript;
      }
    } catch (error) {
      console.log(
        `[Transcript] Failed with ${lang || "auto"}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Continue to next language
    }
  }

  // If all attempts failed, try one more time with a delay
  console.log(`[Transcript] All attempts failed, trying one final time...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    if (transcriptData && transcriptData.length > 0) {
      const fullTranscript = transcriptData
        .map((segment) => segment.text)
        .join(" ")
        .trim();
      if (fullTranscript.length > 0) {
        console.log(`[Transcript] ✅ Final attempt succeeded!`);
        return fullTranscript;
      }
    }
  } catch (error) {
    console.error(
      `[Transcript] Final attempt failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }

  console.error(`[Transcript] ❌ All transcript fetch attempts exhausted`);
  return null;
}
