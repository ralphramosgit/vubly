import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const videoBuffer = session.videoBuffer;

  if (!videoBuffer) {
    return NextResponse.json({ error: "Video not available" }, { status: 404 });
  }

  // Support range requests for video seeking
  const range = req.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : videoBuffer.length - 1;
    const chunkSize = end - start + 1;
    const chunk = videoBuffer.subarray(start, end + 1);

    return new NextResponse(Buffer.from(chunk), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${videoBuffer.length}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": "video/mp4",
      },
    });
  }

  return new NextResponse(Buffer.from(videoBuffer), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoBuffer.length.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
