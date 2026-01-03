import { Innertube } from "youtubei.js";

export async function getYouTubeTranscriptViaInnertube(
  videoId: string
): Promise<string | null> {
  try {
    console.log(
      `[Innertube] Fetching YouTube captions for ${videoId} using youtubei.js...`
    );

    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);

    // Get transcript from the video
    const transcriptData = await info.getTranscript();

    if (!transcriptData) {
      console.log(`[Innertube] No transcript available`);
      return null;
    }

    // Extract text from transcript segments
    const segments = transcriptData.transcript?.content?.body?.initial_segments;

    if (!segments || segments.length === 0) {
      console.log(`[Innertube] No transcript segments found`);
      return null;
    }

    // Combine all segments into full text
    const fullTranscript = segments
      .map((segment: any) => segment.snippet?.text || "")
      .filter((text: string) => text.length > 0)
      .join(" ")
      .trim();

    if (fullTranscript.length > 0) {
      console.log(
        `[Innertube] ✅ Successfully fetched transcript (${fullTranscript.length} chars): ${fullTranscript.substring(0, 100)}...`
      );
      return fullTranscript;
    }

    return null;
  } catch (error) {
    console.error(
      `[Innertube] Failed to fetch captions:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}
