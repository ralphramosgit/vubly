import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { getYouTubeTranscript } from "@/lib/youtube-transcript";
import { getYouTubeTranscriptViaInnertube } from "@/lib/youtube-transcript-innertube";

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

    // Try Method 1: youtube-transcript
    let transcript = await getYouTubeTranscript(videoId);

    // Try Method 2: youtubei.js
    if (!transcript) {
      console.log(
        `[Check] First method failed, trying innertube for ${videoId}...`
      );
      transcript = await getYouTubeTranscriptViaInnertube(videoId);
    }

    if (transcript) {
      return NextResponse.json({
        hasCaptions: true,
        videoId,
        previewText: transcript.substring(0, 200),
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
