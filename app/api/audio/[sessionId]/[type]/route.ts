import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; type: string }> }
) {
  const { sessionId, type } = await params;
  const session = await getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let audioBuffer: Buffer | undefined;

  if (type === "original") {
    audioBuffer = session.originalAudio;
  } else if (type === "translated") {
    audioBuffer = session.translatedAudio;
  }

  if (!audioBuffer) {
    return NextResponse.json({ error: "Audio not available" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(audioBuffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
