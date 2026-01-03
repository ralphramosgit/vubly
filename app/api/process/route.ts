import { NextRequest, NextResponse } from "next/server";
import {
  extractVideoId,
  downloadAudio,
  downloadVideo,
  getVideoInfo,
} from "@/lib/youtube";
import { getYouTubeTranscript } from "@/lib/youtube-transcript";
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
    // Step 1: Download audio and video in parallel with timeout
    console.log(`[${sessionId}] Downloading audio and video...`);
    await updateSession(sessionId, { status: "processing" });

    const downloadPromise = Promise.all([
      downloadAudio(videoId),
      downloadVideo(videoId),
    ]);

    // Add 60-second timeout for downloads
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Download timeout after 60 seconds")),
        60000
      )
    );

    const [audioBuffer, videoBuffer] = await Promise.race([
      downloadPromise,
      timeoutPromise,
    ]);

    await updateSession(sessionId, { originalAudio: audioBuffer, videoBuffer });
    console.log(`[${sessionId}] Audio downloaded: ${audioBuffer.length} bytes`);
    console.log(`[${sessionId}] Video downloaded: ${videoBuffer.length} bytes`);

    // Step 2: Try to get transcript from YouTube captions first
    console.log(`[${sessionId}] Checking for YouTube captions...`);
    let transcript = "";
    
    const youtubeTranscript = await getYouTubeTranscript(videoId);
    
    if (youtubeTranscript) {
      console.log(`[${sessionId}] Using YouTube captions as transcript`);
      transcript = youtubeTranscript;
      await updateSession(sessionId, { transcript });
    } else {
      // No captions available, transcribe audio
      console.log(`[${sessionId}] No captions found, transcribing audio...`);
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

    // Step 3: Detect language
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
