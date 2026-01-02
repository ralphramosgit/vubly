import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Don't send binary data in status check
  const { originalAudio, translatedAudio, videoBuffer, ...sessionData } =
    session;

  return NextResponse.json({
    ...sessionData,
    hasOriginalAudio: !!originalAudio,
    hasTranslatedAudio: !!translatedAudio,
    hasVideo: !!videoBuffer,
  });
}
