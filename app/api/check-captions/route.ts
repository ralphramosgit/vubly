import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
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

    // Try to fetch captions
    const transcript = await getYouTubeTranscript(videoId);

    if (transcript) {
      return NextResponse.json({
        hasCaptions: true,
        videoId,
        message: "✅ This video has captions and can be processed",
      });
    } else {
      return NextResponse.json({
        hasCaptions: false,
        videoId,
        message:
          "⚠️ This video does NOT have captions available. Please choose a different video with auto-generated captions or subtitles enabled.",
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
