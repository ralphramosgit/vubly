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

    console.log(`[Innertube] Got video info, attempting to get transcript...`);

    // Get transcript from the video
    const transcriptData = await info.getTranscript();

    console.log(
      `[Innertube] Transcript data:`,
      JSON.stringify(transcriptData, null, 2).substring(0, 500)
    );

    if (!transcriptData) {
      console.log(`[Innertube] No transcript data returned`);
      return null;
    }

    // The transcript object structure - try multiple paths
    const transcript = (transcriptData as any).transcript;

    if (!transcript) {
      console.log(`[Innertube] No transcript object in response`);
      return null;
    }

    // Try to get the segments - the structure can vary
    const body =
      transcript.content?.body || transcript.body || transcript.transcript_body;
    const segments =
      body?.initial_segments || body?.segments || body?.transcript_segments;

    if (!segments || segments.length === 0) {
      console.log(`[Innertube] No transcript segments found in body`);
      console.log(`[Innertube] Body structure:`, JSON.stringify(body, null, 2));
      return null;
    }

    console.log(`[Innertube] Found ${segments.length} segments`);

    // Combine all segments into full text
    const fullTranscript = segments
      .map((segment: any) => {
        // Try different possible text locations
        return (
          segment.snippet?.text ||
          segment.text ||
          segment.snippet ||
          segment.utf8 ||
          ""
        );
      })
      .filter((text: string) => text.length > 0)
      .join(" ")
      .trim();

    if (fullTranscript.length > 0) {
      console.log(
        `[Innertube] ✅ Successfully fetched transcript (${fullTranscript.length} chars): ${fullTranscript.substring(0, 100)}...`
      );
      return fullTranscript;
    }

    console.log(`[Innertube] Segments found but no text extracted`);
    return null;
  } catch (error) {
    console.error(
      `[Innertube] Failed to fetch captions:`,
      error instanceof Error ? error.message : String(error)
    );
    console.error(`[Innertube] Full error:`, error);
    return null;
  }
}
