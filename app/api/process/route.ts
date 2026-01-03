import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, downloadVideo, getVideoInfo } from "@/lib/youtube";
import { downloadYouTubeAudio } from "@/lib/youtube-download";
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
    const sessionId = await createSession(videoId, videoInfo);

    // Start processing and WAIT for webhook to be triggered
    // This keeps the connection alive so Vercel doesn't kill the background work
    await processVideoAndTriggerWebhook(
      sessionId,
      videoId,
      targetLanguage,
      voiceId
    );

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

async function processVideoAndTriggerWebhook(
  sessionId: string,
  videoId: string,
  targetLanguage: string,
  voiceId: string
) {
  try {
    // NEW WORKFLOW:
    // 1. Download audio via third-party (y2mate/RapidAPI) - bypasses YouTube bot detection
    // 2. Transcribe with OpenAI Whisper
    // 3. Send transcript to Make.com

    // Step 1: Download audio using third-party services
    console.log(`[${sessionId}] Downloading audio via third-party service...`);
    let audioBuffer: Buffer;

    try {
      audioBuffer = await downloadYouTubeAudio(videoId);
      console.log(
        `[${sessionId}] ✅ Audio downloaded: ${audioBuffer.length} bytes`
      );
    } catch (downloadError) {
      console.error(`[${sessionId}] Audio download failed:`, downloadError);
      throw new Error(
        `Failed to download audio: ${downloadError instanceof Error ? downloadError.message : "Unknown error"}`
      );
    }

    await updateSession(sessionId, {
      originalAudio: audioBuffer,
      status: "processing",
    });

    // Step 2: Transcribe audio with OpenAI Whisper
    console.log(`[${sessionId}] Transcribing audio with Whisper...`);
    let transcript: string;

    try {
      const transcription = await transcribeAudio(audioBuffer);
      transcript = transcription.text;
      await updateSession(sessionId, { transcript });
      console.log(
        `[${sessionId}] ✅ Transcription complete (${transcript.length} chars)`
      );
      console.log(`[${sessionId}] Preview: ${transcript.substring(0, 200)}...`);
    } catch (transcribeError) {
      console.error(`[${sessionId}] Transcription failed:`, transcribeError);
      throw new Error(
        `Failed to transcribe audio: ${transcribeError instanceof Error ? transcribeError.message : "Unknown error"}`
      );
    }

    // Step 3: Detect language
    console.log(`[${sessionId}] Detecting language...`);
    let detectedLanguage = "en";
    try {
      detectedLanguage = await detectLanguage(transcript);
      await updateSession(sessionId, { detectedLanguage });
      console.log(`[${sessionId}] ✅ Language detected: ${detectedLanguage}`);
    } catch (detectError) {
      console.error(`[${sessionId}] Language detection failed:`, detectError);
      // Non-fatal, continue with default
    }

    // Step 4: Try to download video (non-fatal if fails)
    let videoBuffer: Buffer | null = null;
    try {
      console.log(`[${sessionId}] Downloading video...`);
      videoBuffer = await downloadVideo(videoId);
      console.log(
        `[${sessionId}] ✅ Video downloaded: ${videoBuffer.length} bytes`
      );
      await updateSession(sessionId, { videoBuffer });
    } catch (videoError) {
      console.warn(
        `[${sessionId}] ⚠️ Video download failed (non-fatal):`,
        videoError
      );
    }

    // Step 5: Send to Make.com for translation & TTS
    console.log(`[${sessionId}] Sending to Make.com webhook...`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/api/makecom-callback`;

    try {
      const webhookResult = await sendToMakeWebhook({
        sessionId,
        transcript,
        detectedLanguage,
        targetLanguage,
        voiceId,
        callbackUrl,
      });
      console.log(
        `[${sessionId}] ✅ Webhook sent successfully:`,
        webhookResult
      );
    } catch (webhookError) {
      console.error(`[${sessionId}] Webhook failed:`, webhookError);
      throw webhookError;
    }

    console.log(
      `[${sessionId}] ✅ Processing complete. Waiting for Make.com callback.`
    );
  } catch (error: unknown) {
    console.error(`[${sessionId}] ❌ FATAL ERROR:`, error);
    await updateSession(sessionId, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
