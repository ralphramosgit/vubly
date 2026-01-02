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

// In-memory storage (use Redis or database in production)
const sessions = new Map<string, SessionData>();

export function createSession(
  videoId: string,
  videoInfo: SessionData["videoInfo"]
): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  sessions.set(sessionId, {
    id: sessionId,
    videoId,
    videoInfo,
    status: "processing",
    createdAt: new Date(),
  });

  return sessionId;
}

export function getSession(sessionId: string): SessionData | undefined {
  return sessions.get(sessionId);
}

export function updateSession(
  sessionId: string,
  updates: Partial<SessionData>
): void {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.set(sessionId, { ...session, ...updates });
  }
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// Clean up old sessions (> 1 hour)
setInterval(() => {
  const now = new Date();
  for (const [id, session] of sessions.entries()) {
    const age = now.getTime() - session.createdAt.getTime();
    if (age > 3600000) {
      // 1 hour
      sessions.delete(id);
    }
  }
}, 300000); // Run every 5 minutes
