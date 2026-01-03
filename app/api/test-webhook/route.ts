import { NextRequest, NextResponse } from "next/server";
import { sendToMakeWebhook } from "@/lib/makecom";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);
const SESSION_TTL = 3600; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const {
      sessionId,
      transcript,
      detectedLanguage,
      targetLanguage,
      voiceId,
      callbackUrl,
    } = payload;

    // Validate required fields
    if (
      !sessionId ||
      !transcript ||
      !detectedLanguage ||
      !targetLanguage ||
      !voiceId ||
      !callbackUrl
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("Test webhook - sending payload to Make.com:", payload);

    // Create a minimal session for this test
    const sessionData = {
      id: sessionId,
      videoId: "test-video",
      videoInfo: {
        id: "test-video",
        title: "Test Translation",
        duration: 0,
        thumbnail: "",
        author: "Test",
      },
      transcript,
      detectedLanguage,
      targetLanguage,
      voiceId,
      status: "processing",
      createdAt: new Date(),
    };

    // Store session in Redis
    await redis.set(sessionId, JSON.stringify(sessionData), "EX", SESSION_TTL);
    console.log(`[Test] Created test session ${sessionId} in Redis`);

    // Send to Make.com webhook
    const result = await sendToMakeWebhook({
      sessionId,
      transcript,
      detectedLanguage,
      targetLanguage,
      voiceId,
      callbackUrl,
    });

    console.log("Test webhook - Make.com response:", result);

    return NextResponse.json({
      success: true,
      message: result.message,
      sessionId,
    });
  } catch (error: any) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send webhook" },
      { status: 500 }
    );
  }
}
