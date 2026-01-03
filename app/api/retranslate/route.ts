import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/session";

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, targetLanguage, voiceId } = await request.json();

    if (!sessionId || !targetLanguage || !voiceId) {
      return NextResponse.json(
        {
          error: "Missing required fields: sessionId, targetLanguage, voiceId",
        },
        { status: 400 }
      );
    }

    // Get existing session
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.transcript) {
      return NextResponse.json(
        { error: "No transcript available for retranslation" },
        { status: 400 }
      );
    }

    // Update session status to processing
    await updateSession(sessionId, {
      status: "processing",
      targetLanguage,
      translatedText: undefined,
      translatedAudio: undefined,
    });

    // Send to Make.com for retranslation
    const baseUrl = request.headers.get("host")?.includes("localhost")
      ? `http://${request.headers.get("host")}`
      : `https://${request.headers.get("host")}`;

    const callbackUrl = `${baseUrl}/api/makecom-callback`;

    const payload = {
      sessionId,
      transcript: session.transcript,
      detectedLanguage: session.detectedLanguage || "en",
      targetLanguage,
      voiceId,
      callbackUrl,
    };

    console.log(`[${sessionId}] Sending retranslation request to Make.com...`);

    // Send async - don't wait for response
    fetch(MAKE_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error("Make.com webhook error:", err));

    return NextResponse.json({
      success: true,
      message: "Retranslation started",
      sessionId,
    });
  } catch (error) {
    console.error("Retranslate error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Retranslation failed",
      },
      { status: 500 }
    );
  }
}
