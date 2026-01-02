import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { sessionId, translation, audioData } = await req.json();

    if (!sessionId || !translation || !audioData) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, translation, audioData" },
        { status: 400 }
      );
    }

    console.log(
      `[${sessionId}] Received Make.com callback with translation and audio`
    );

    // Convert base64 audio to buffer
    const translatedAudioBuffer = Buffer.from(audioData, "base64");

    // Update session with translated content
    await updateSession(sessionId, {
      translatedText: translation,
      translatedAudio: translatedAudioBuffer,
      status: "completed",
    });

    console.log(`[${sessionId}] Session updated successfully`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Make.com callback error:", error);
    return NextResponse.json(
      { error: error.message || "Callback processing failed" },
      { status: 500 }
    );
  }
}
