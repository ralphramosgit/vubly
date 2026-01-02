import Redis from "ioredis";

interface SessionData {
  id: string;
  videoId: string;
  videoInfo: {
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    author: string;
  };
  videoBuffer?: Buffer;
  originalAudio?: Buffer;
  transcript?: string;
  detectedLanguage?: string;
  translatedText?: string;
  translatedAudio?: Buffer;
  targetLanguage?: string;
  voiceId?: string;
  status: "processing" | "completed" | "error";
  error?: string;
  createdAt: Date;
}

// Redis client
const redis = new Redis(process.env.REDIS_URL!);

// Session TTL: 1 hour
const SESSION_TTL = 3600; // seconds

export async function createSession(
  videoId: string,
  videoInfo: SessionData["videoInfo"]
): Promise<string> {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const sessionData: SessionData = {
    id: sessionId,
    videoId,
    videoInfo,
    status: "processing",
    createdAt: new Date(),
  };

  await redis.set(sessionId, JSON.stringify(sessionData), "EX", SESSION_TTL);
  console.log(`[Session] Created session ${sessionId} in Redis`);

  return sessionId;
}

export async function getSession(
  sessionId: string
): Promise<SessionData | null> {
  const data = await redis.get(sessionId);

  if (!data) {
    console.log(`[Session] Session ${sessionId} not found in Redis`);
    return null;
  }

  const session = JSON.parse(data) as SessionData;

  // Convert date strings back to Date objects
  session.createdAt = new Date(session.createdAt);

  // Convert base64 buffers back to Buffer objects if they exist
  if (session.videoBuffer && typeof session.videoBuffer === "string") {
    session.videoBuffer = Buffer.from(
      session.videoBuffer as unknown as string,
      "base64"
    );
  }
  if (session.originalAudio && typeof session.originalAudio === "string") {
    session.originalAudio = Buffer.from(
      session.originalAudio as unknown as string,
      "base64"
    );
  }
  if (session.translatedAudio && typeof session.translatedAudio === "string") {
    session.translatedAudio = Buffer.from(
      session.translatedAudio as unknown as string,
      "base64"
    );
  }

  return session;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<SessionData>
): Promise<void> {
  const session = await getSession(sessionId);

  if (!session) {
    console.error(`[Session] Cannot update - session ${sessionId} not found`);
    return;
  }

  const updatedSession = { ...session, ...updates };

  // Convert Buffer objects to base64 strings for storage
  const sessionToStore = { ...updatedSession };
  if (sessionToStore.videoBuffer instanceof Buffer) {
    sessionToStore.videoBuffer = sessionToStore.videoBuffer.toString(
      "base64"
    ) as any;
  }
  if (sessionToStore.originalAudio instanceof Buffer) {
    sessionToStore.originalAudio = sessionToStore.originalAudio.toString(
      "base64"
    ) as any;
  }
  if (sessionToStore.translatedAudio instanceof Buffer) {
    sessionToStore.translatedAudio = sessionToStore.translatedAudio.toString(
      "base64"
    ) as any;
  }

  await redis.set(sessionId, JSON.stringify(sessionToStore), "EX", SESSION_TTL);
  console.log(`[Session] Updated session ${sessionId} in Redis`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(sessionId);
  console.log(`[Session] Deleted session ${sessionId} from Redis`);
}
