"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import VideoPlayback from "../components/VideoPlayback";
import VolumeLevels from "../components/VolumeLevels";
import AudioSettings from "../components/AudioSettings";
import TranscriptPanel from "../components/TranscriptPanel";

interface SessionStatus {
  id: string;
  videoId: string;
  videoInfo: {
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    author: string;
  };
  transcript?: string;
  translatedText?: string;
  detectedLanguage?: string;
  targetLanguage?: string;
  status: "processing" | "completed" | "error";
  error?: string;
  hasOriginalAudio: boolean;
  hasTranslatedAudio: boolean;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [audioMode, setAudioMode] = useState<"original" | "translated">(
    "original"
  );

  useEffect(() => {
    if (!sessionId) return;

    let pollCount = 0;
    const maxPolls = 150; // 5 minutes at 2 second intervals

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}`);

        if (!response.ok) {
          pollCount++;
          if (pollCount >= 5) {
            // After 5 failed attempts (10 seconds), show error
            clearInterval(interval);
            setSession({
              id: sessionId,
              videoId: "",
              videoInfo: {
                id: "",
                title: "Session Not Found",
                duration: 0,
                thumbnail: "",
                author: "",
              },
              status: "error",
              error:
                "Session not found. The video processing may have failed or the session expired.",
              hasOriginalAudio: false,
              hasTranslatedAudio: false,
            });
          }
          return;
        }

        const data = await response.json();
        setSession(data);

        // Stop polling if completed or error
        if (data.status === "completed" || data.status === "error") {
          clearInterval(interval);
        }

        pollCount++;
        if (pollCount >= maxPolls) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Failed to fetch status:", error);
        pollCount++;
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-saas-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            No Session Found
          </h1>
          <p className="text-gray-400">
            Please start from the video input page.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-saas-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-saas-yellow mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  // Extra validation for videoInfo
  if (!session.videoInfo) {
    return (
      <div className="min-h-screen bg-saas-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-saas-yellow mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading video information...</p>
        </div>
      </div>
    );
  }

  if (session.status === "error") {
    return (
      <div className="min-h-screen bg-saas-black text-white flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-8 max-w-md">
          <div className="text-red-400 text-xl font-bold mb-4">Error</div>
          <p className="text-gray-300">{session.error}</p>
          <button
            onClick={() => (window.location.href = "/videoInput")}
            className="mt-6 bg-saas-yellow hover:bg-[#E6E600] text-black font-bold px-6 py-3 rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-saas-black text-white">
      <div className="container mx-auto px-4 py-4 md:py-6 lg:py-8">
        {/* Processing Banner */}
        {session.status === "processing" && (
          <div className="mb-6 bg-saas-yellow/20 border border-saas-yellow rounded-lg p-4 flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saas-yellow"></div>
            <div>
              <p className="font-bold text-saas-yellow">
                Processing your video...
              </p>
              <p className="text-sm text-gray-400">
                This may take a few minutes. The page will update automatically.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Left Column - Volume Levels */}
          <div className="lg:col-span-2 order-3 lg:order-1">
            <VolumeLevels />
          </div>

          {/* Middle Column - Video and Transcripts */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-4 md:space-y-6">
            {/* Video Player */}
            <VideoPlayback
              videoInfo={session.videoInfo}
              sessionId={session.id}
              audioMode={audioMode}
              onAudioModeChange={setAudioMode}
              hasTranslatedAudio={session.hasTranslatedAudio}
              status={session.status}
            />

            {/* Transcripts */}
            {session.status === "completed" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <TranscriptPanel
                  title={`Original (${session.detectedLanguage?.toUpperCase() || "N/A"})`}
                  content={session.transcript || ""}
                />
                <TranscriptPanel
                  title={`Translation (${session.targetLanguage?.toUpperCase() || "N/A"})`}
                  content={session.translatedText || ""}
                />
              </div>
            )}
          </div>

          {/* Right Column - Audio Settings */}
          <div className="lg:col-span-3 order-2 lg:order-3">
            <AudioSettings />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-saas-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-saas-yellow mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
