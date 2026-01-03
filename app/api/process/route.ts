import { NextRequest, NextResponse } from "next/server";
import {
  extractVideoId,
  downloadAudio,
  downloadVideo,
  getVideoInfo,
} from "@/lib/youtube";
import { getYouTubeTranscript } from "@/lib/youtube-transcript";
import { getYouTubeTranscriptViaInnertube } from "@/lib/youtube-transcript-innertube";
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
    // Step 1: Try to get transcript from YouTube captions first
    console.log(`[${sessionId}] Checking for YouTube captions...`);
    let transcript = "";

    // Try Method 1: youtube-transcript package
    let youtubeTranscript = await getYouTubeTranscript(videoId);

    // Try Method 2: youtubei.js if first method failed
    if (!youtubeTranscript) {
      console.log(`[${sessionId}] First method failed, trying youtubei.js...`);
      youtubeTranscript = await getYouTubeTranscriptViaInnertube(videoId);
    }

    if (youtubeTranscript) {
      console.log(`[${sessionId}] ✅ Using YouTube captions as transcript`);
      transcript = youtubeTranscript;
      await updateSession(sessionId, { transcript, status: "processing" });
    } else {
      console.log(
        `[${sessionId}] ⚠️ Could not fetch captions from YouTube with either method`
      );
    }

    // Step 2: Download audio and video (skip audio if we have transcript)
    let audioBuffer: Buffer | null = null;
    let videoBuffer: Buffer | null = null;

    if (!transcript) {
      // Only download audio if we don't have transcript
      console.log(
        `[${sessionId}] No captions found, downloading audio for transcription...`
      );
      try {
        audioBuffer = await downloadAudio(videoId);
        console.log(
          `[${sessionId}] Audio downloaded: ${audioBuffer.length} bytes`
        );
      } catch (audioError) {
        console.error(`[${sessionId}] Audio download failed:`, audioError);
        throw new Error("No transcript available and audio download failed");
      }
    } else {
      console.log(
        `[${sessionId}] Skipping audio download (have transcript from YouTube)`
      );
    }

    // Try to download video (non-fatal if fails)
    try {
      videoBuffer = await downloadVideo(videoId);
      console.log(
        `[${sessionId}] Video downloaded: ${videoBuffer.length} bytes`
      );
    } catch (videoError) {
      console.warn(
        `[${sessionId}] Video download failed (non-fatal):`,
        videoError
      );
      console.log(`[${sessionId}] Continuing without video...`);
    }

    await updateSession(sessionId, {
      originalAudio: audioBuffer || undefined,
      videoBuffer: videoBuffer || undefined,
    });

    // Step 3: Transcribe audio if we didn't get YouTube transcript
    if (!transcript && audioBuffer) {
      console.log(`[${sessionId}] Transcribing audio...`);
      try {
        const transcription = await transcribeAudio(audioBuffer);
        transcript = transcription.text;
        await updateSession(sessionId, { transcript });
        console.log(
          `[${sessionId}] Transcription complete: ${transcript.substring(0, 100)}...`
        );
      } catch (transcribeError) {
        console.error(`[${sessionId}] TRANSCRIPTION FAILED:`, transcribeError);
        throw transcribeError;
      }
    }

    if (!transcript) {
      throw new Error(
        "Unable to get transcript for this video. This video may have captions disabled or is protected by YouTube. Please try a different video, preferably one with auto-generated captions enabled."
      );
    }

    // Step 4: Detect language
    console.log(`[${sessionId}] Starting language detection...`);
    let detectedLanguage = "en";
    try {
      detectedLanguage = await detectLanguage(transcript);
      await updateSession(sessionId, { detectedLanguage });
      console.log(`[${sessionId}] Language detected: ${detectedLanguage}`);
    } catch (detectError) {
      console.error(`[${sessionId}] LANGUAGE DETECTION FAILED:`, detectError);
      throw detectError;
    }

    // Step 4: Send to Make.com for translation & TTS (async)
    console.log(`[${sessionId}] Preparing to send to Make.com webhook...`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/api/makecom-callback`;

    console.log(`[${sessionId}] Callback URL: ${callbackUrl}`);
    console.log(`[${sessionId}] Target language: ${targetLanguage}`);
    console.log(`[${sessionId}] Voice ID: ${voiceId}`);

    try {
      console.log(`[${sessionId}] Calling sendToMakeWebhook NOW...`);
      const webhookResult = await sendToMakeWebhook({
        sessionId,
        transcript,
        detectedLanguage,
        targetLanguage,
        voiceId,
        callbackUrl,
      });
      console.log(`[${sessionId}] WEBHOOK CALL COMPLETE:`, webhookResult);
    } catch (webhookError) {
      console.error(`[${sessionId}] WEBHOOK CALL FAILED:`, webhookError);
      throw webhookError;
    }

    console.log(
      `[${sessionId}] ✅ All steps complete. Waiting for Make.com callback at ${callbackUrl}`
    );
  } catch (error: unknown) {
    console.error(`[${sessionId}] ❌ FATAL ERROR:`, error);
    console.error(`[${sessionId}] Error type:`, typeof error);
    console.error(
      `[${sessionId}] Error details:`,
      error instanceof Error ? error.stack : String(error)
    );
    await updateSession(sessionId, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
