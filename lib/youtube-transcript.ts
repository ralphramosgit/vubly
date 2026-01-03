import { YoutubeTranscript } from "youtube-transcript";

export async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`[Transcript] Fetching YouTube captions for ${videoId}...`);
    
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcriptData || transcriptData.length === 0) {
      return null;
    }
    
    // Combine all transcript segments into full text
    const fullTranscript = transcriptData
      .map((segment) => segment.text)
      .join(" ")
      .trim();
    
    console.log(`[Transcript] Successfully fetched transcript: ${fullTranscript.substring(0, 100)}...`);
    
    return fullTranscript;
  } catch (error) {
    console.error(`[Transcript] Failed to fetch captions:`, error);
    return null;
  }
}
