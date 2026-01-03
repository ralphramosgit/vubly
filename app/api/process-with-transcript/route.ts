import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, getVideoInfo } from "@/lib/youtube";
import { detectLanguage } from "@/lib/openai";
import { sendToMakeWebhook } from "@/lib/makecom";
import { createSession, updateSession } from "@/lib/session";

export const maxDuration = 300;

// This endpoint receives the transcript directly from the client
// The client extracts captions using their browser (not blocked by YouTube)
export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl, targetLanguage, voiceId, transcript } = await req.json();

    // Validate input
    if (!youtubeUrl || !targetLanguage || !voiceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!transcript || transcript.length < 10) {
      return NextResponse.json(
        { error: "No transcript provided. Please ensure the video has captions enabled." },
        { status: 400 }
      );
    }

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Get video info
    const videoInfo = await getVideoInfo(videoId);

    // Create session
    const sessionId = await createSession(videoId, videoInfo);

    console.log(`[${sessionId}] Received transcript from client (${transcript.length} chars)`);
    console.log(`[${sessionId}] Preview: ${transcript.substring(0, 200)}...`);

    // Update session with transcript
    await updateSession(sessionId, { transcript, status: "processing" });

    // Detect language
    console.log(`[${sessionId}] Detecting language...`);
    const detectedLanguage = await detectLanguage(transcript);
    await updateSession(sessionId, { detectedLanguage });
    console.log(`[${sessionId}] Language detected: ${detectedLanguage}`);

    // Send to Make.com for translation & TTS
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vubly.vercel.app";
    const callbackUrl = `${baseUrl}/api/makecom-callback`;

    console.log(`[${sessionId}] Sending to Make.com webhook...`);
    await sendToMakeWebhook({
      sessionId,
      transcript,
      detectedLanguage,
      targetLanguage,
      voiceId,
      callbackUrl,
    });

    console.log(`[${sessionId}] ✅ Processing started successfully`);

    return NextResponse.json({
      success: true,
      sessionId,
      videoInfo,
      transcriptLength: transcript.length,
    });
  } catch (error: unknown) {
    console.error("Process with transcript error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}
