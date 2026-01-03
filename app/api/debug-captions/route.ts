import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";

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

    // Fetch the video page HTML to see what captions are available
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = await response.text();

    // Look for caption tracks in the HTML
    const captionTracksMatch = html.match(/"captionTracks":\[(.*?)\]/);
    const playerResponseMatch = html.match(
      /"captions":\{[^}]*"playerCaptionsTracklistRenderer":\{([^}]*)\}/
    );

    const hasCaptionTracks = captionTracksMatch !== null;
    const hasPlayerCaptions = playerResponseMatch !== null;

    // Try to extract available languages
    let availableLanguages: string[] = [];
    if (captionTracksMatch) {
      const trackMatches = captionTracksMatch[1].matchAll(
        /"languageCode":"([^"]+)"/g
      );
      availableLanguages = Array.from(trackMatches, (m) => m[1]);
    }

    return NextResponse.json({
      videoId,
      hasCaptionTracks,
      hasPlayerCaptions,
      availableLanguages,
      debug: {
        captionTracksFound: !!captionTracksMatch,
        playerCaptionsFound: !!playerResponseMatch,
        captionTracksSnippet: captionTracksMatch
          ? captionTracksMatch[0].substring(0, 200)
          : null,
      },
    });
  } catch (error) {
    console.error("Debug captions error:", error);
    return NextResponse.json(
      {
        error: "Failed to debug captions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
