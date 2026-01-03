import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Make.com callback received body:", JSON.stringify(body, null, 2));

    // Accept a few common field names for compatibility
    const sessionId = body.sessionId || body.session_id || body.session || body.id;
    const translation =
      body.translation || body.translatedText || body.text || body.translation_text || body.data?.translation || body.data?.translatedText;

    let audioBase64 =
      body.audioData || body.audio_base64 || body.audio || body.data?.audio_base64 || body.data?.audio || body.data?.data;

    // Some modules may return arrays/objects — normalize
    if (Array.isArray(audioBase64)) {
      audioBase64 = audioBase64[0];
    }
    if (typeof audioBase64 === "object" && audioBase64?.data) {
      audioBase64 = audioBase64.data;
    }

    // If the audio is a data URL like "data:audio/mpeg;base64,..." strip the prefix
    if (typeof audioBase64 === "string" && audioBase64.startsWith("data:")) {
      const parts = audioBase64.split(",");
      audioBase64 = parts[1] || parts[0];
    }

    if (!sessionId || !translation || !audioBase64) {
      console.error("Make.com callback missing required fields", {
        sessionId: !!sessionId,
        translation: !!translation,
        audioFound: !!audioBase64,
      });

      return NextResponse.json(
        {
          error: "Missing required fields: sessionId, translation, audioData",
          received: {
            sessionId: sessionId || null,
            translation: translation ? "[present]" : null,
            audioKeys: Object.keys(body || {}),
          },
        },
        { status: 400 }
      );
    }

    // Convert base64 audio to buffer
    const translatedAudioBuffer = Buffer.from(audioBase64, "base64");

    // Update session with translated content
    await updateSession(sessionId, {
      translatedText: translation,
      translatedAudio: translatedAudioBuffer,
      status: "completed",
    });

    console.log(`[${sessionId}] Session updated successfully via Make.com callback`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Make.com callback error:", error);
    return NextResponse.json(
      { error: error.message || "Callback processing failed" },
      { status: 500 }
    );
  }
}
