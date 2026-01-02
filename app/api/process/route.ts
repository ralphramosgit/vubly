import { NextRequest, NextResponse } from "next/server";
import {
  extractVideoId,
  downloadAudio,
  downloadVideo,
  getVideoInfo,
} from "@/lib/youtube";
import { transcribeAudio, detectLanguage } from "@/lib/openai";
import { sendToMakeWebhook } from "@/lib/makecom";
import { createSession, updateSession } from "@/lib/session";

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl, targetLanguage, voiceId } = await req.json();

    // Validate input
    if (!youtubeUrl || !targetLanguage || !voiceId) {
      return NextResponse.json(
        {
          error: "Missing required fields: youtubeUrl, targetLanguage, voiceId",
        },
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
    const sessionId = createSession(videoId, videoInfo);

    // Start async processing
    processVideo(sessionId, videoId, targetLanguage, voiceId);

    return NextResponse.json({
      success: true,
      sessionId,
      videoInfo,
    });
  } catch (error: unknown) {
    console.error("Process error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

async function processVideo(
  sessionId: string,
  videoId: string,
  targetLanguage: string,
  voiceId: string
) {
  try {
    // Step 1: Download audio and video in parallel
    console.log(`[${sessionId}] Downloading audio and video...`);
    updateSession(sessionId, { status: "processing" });

    const [audioBuffer, videoBuffer] = await Promise.all([
      downloadAudio(videoId),
      downloadVideo(videoId),
    ]);

    updateSession(sessionId, { originalAudio: audioBuffer, videoBuffer });
    console.log(`[${sessionId}] Audio downloaded: ${audioBuffer.length} bytes`);
    console.log(`[${sessionId}] Video downloaded: ${videoBuffer.length} bytes`);

    // Step 2: Transcribe
    console.log(`[${sessionId}] Transcribing audio...`);
    const transcription = await transcribeAudio(audioBuffer);
    const transcript = transcription.text;
    updateSession(sessionId, { transcript });
    console.log(
      `[${sessionId}] Transcription complete: ${transcript.substring(0, 100)}...`
    );

    // Step 3: Detect language
    console.log(`[${sessionId}] Detecting language...`);
    const detectedLanguage = await detectLanguage(transcript);
    updateSession(sessionId, { detectedLanguage });
    console.log(`[${sessionId}] Detected language: ${detectedLanguage}`);

    // Step 4: Send to Make.com for translation & TTS (async)
    console.log(`[${sessionId}] Sending to Make.com webhook (async mode)...`);

    // Build callback URL - Make.com will call this when done
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/api/makecom-callback`;

    await sendToMakeWebhook({
      sessionId,
      transcript,
      detectedLanguage,
      targetLanguage,
      voiceId,
      callbackUrl,
    });

    console.log(
      `[${sessionId}] Webhook triggered. Waiting for callback at ${callbackUrl}`
    );
    // Status remains "processing" until callback receives results
  } catch (error: unknown) {
    console.error(`[${sessionId}] Processing error:`, error);
    updateSession(sessionId, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
