import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, extractSubtitlesViaYtdlp } from "@/lib/youtube";
import { getYouTubeTranscript } from "@/lib/youtube-transcript";

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Use the unified transcript function which tries all methods
    const transcript = await getYouTubeTranscript(videoId);

    if (transcript && transcript.length > 50) {
      return NextResponse.json({
        hasCaptions: true,
        videoId,
        previewText: transcript.substring(0, 200),
        transcriptLength: transcript.length,
        message: "✅ This video has captions and can be processed",
      });
    } else {
      return NextResponse.json({
        hasCaptions: false,
        videoId,
        message:
          "⚠️ Could not extract captions from this video. The video may have captions disabled or be protected.",
      });
    }
  } catch (error) {
    console.error("Caption check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check captions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
