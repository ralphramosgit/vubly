"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";

interface VideoPlaybackProps {
  videoInfo: {
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    author: string;
  };
  sessionId: string;
  audioMode: "original" | "translated";
  onAudioModeChange: (mode: "original" | "translated") => void;
  hasTranslatedAudio: boolean;
  status: "processing" | "completed" | "error";
}

export default function VideoPlayback({
  videoInfo,
  sessionId,
  audioMode,
  onAudioModeChange,
  hasTranslatedAudio,
  status,
}: VideoPlaybackProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // Sync video and audio playback (or audio-only if video failed)
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!audio) return;

    // If video failed or not available, use audio-only mode
    if (videoFailed || !video) {
      const handleAudioPlay = () => setIsPlaying(true);
      const handleAudioPause = () => setIsPlaying(false);
      const handleAudioTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleAudioLoadedMetadata = () => {
        setDuration(audio.duration);
        setAudioReady(true);
      };

      audio.addEventListener("play", handleAudioPlay);
      audio.addEventListener("pause", handleAudioPause);
      audio.addEventListener("timeupdate", handleAudioTimeUpdate);
      audio.addEventListener("loadedmetadata", handleAudioLoadedMetadata);

      return () => {
        audio.removeEventListener("play", handleAudioPlay);
        audio.removeEventListener("pause", handleAudioPause);
        audio.removeEventListener("timeupdate", handleAudioTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleAudioLoadedMetadata);
      };
    }

    // Normal video+audio sync mode
    const handleVideoPlay = () => {
      audio.currentTime = video.currentTime;
      audio.play().catch(console.error);
      setIsPlaying(true);
    };

    const handleVideoPause = () => {
      audio.pause();
      setIsPlaying(false);
    };

    const handleVideoSeeked = () => {
      audio.currentTime = video.currentTime;
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Keep audio in sync (with small tolerance)
      if (Math.abs(video.currentTime - audio.currentTime) > 0.3) {
        audio.currentTime = video.currentTime;
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVideoReady(true);
    };

    video.addEventListener("play", handleVideoPlay);
    video.addEventListener("pause", handleVideoPause);
    video.addEventListener("seeked", handleVideoSeeked);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("play", handleVideoPlay);
      video.removeEventListener("pause", handleVideoPause);
      video.removeEventListener("seeked", handleVideoSeeked);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [videoFailed]);

  // Handle audio mode change
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!audio) return;

    // Sync new audio with current video/audio position
    if (video && !videoFailed) {
      audio.currentTime = video.currentTime;
    }
    if (isPlaying) {
      audio.play().catch(console.error);
    }
  }, [audioMode, isPlaying, videoFailed]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    if (videoRef.current && !videoFailed) {
      videoRef.current.currentTime = time;
    }
  };

  const togglePlayPause = () => {
    // If video failed, use audio-only playback
    if (videoFailed || !videoRef.current) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch(console.error);
        }
      }
      return;
    }
    
    // Normal video+audio playback
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Video Player */}
      <div className="aspect-video bg-black relative">
        {status === "completed" ? (
          <>
            {/* Show video if available, otherwise show thumbnail with audio controls */}
            {!videoFailed ? (
              <video
                ref={videoRef}
                className="w-full h-full"
                poster={videoInfo.thumbnail}
                playsInline
                onClick={togglePlayPause}
                onError={() => {
                  console.log("Video failed to load, switching to audio-only mode");
                  setVideoFailed(true);
                }}
              >
                <source src={`/api/video/${sessionId}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              // Audio-only mode with thumbnail
              <div 
                className="w-full h-full relative cursor-pointer"
                onClick={togglePlayPause}
              >
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-white text-sm bg-black/50 px-3 py-1 rounded">
                    🎵 Audio Only (Video unavailable)
                  </span>
                </div>
              </div>
            )}
            {/* Audio element for playback */}
            <audio
              ref={audioRef}
              src={`/api/audio/${sessionId}/${audioMode}`}
              key={audioMode}
              onLoadedMetadata={() => {
                // If video failed to load but audio loaded, use audio duration
                if (videoFailed && audioRef.current) {
                  setDuration(audioRef.current.duration);
                  setAudioReady(true);
                }
              }}
            />
            {/* Play overlay - show even if video failed but audio is ready */}
            {!isPlaying && (videoReady || audioReady || hasTranslatedAudio) && (
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
              >
                <div className="w-20 h-20 bg-saas-yellow rounded-full flex items-center justify-center shadow-lg">
                  <svg
                    className="w-10 h-10 text-black ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
          </>
        ) : (
          // Show thumbnail while processing
          <div className="relative w-full h-full">
            <Image
              src={videoInfo?.thumbnail || "/placeholder.png"}
              alt={videoInfo?.title || "Video"}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-saas-yellow mx-auto mb-4"></div>
                <p className="text-white font-medium">Downloading video...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Info & Controls */}
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            {videoInfo.title}
          </h2>
          <p className="text-gray-400 text-sm">{videoInfo.author}</p>
        </div>

        {/* Video Progress Bar */}
        {status === "completed" && (videoReady || audioReady) && (
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-saas-yellow"
            />
            <div className="flex justify-between text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Audio Controls */}
        {status === "completed" && (
          <div className="space-y-4">
            {/* Audio Mode Toggle */}
            <div className="flex gap-3">
              <button
                onClick={() => onAudioModeChange("original")}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  audioMode === "original"
                    ? "bg-saas-yellow text-black shadow-lg shadow-saas-yellow/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Original Audio
              </button>
              <button
                onClick={() => onAudioModeChange("translated")}
                disabled={!hasTranslatedAudio}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  audioMode === "translated"
                    ? "bg-saas-yellow text-black shadow-lg shadow-saas-yellow/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Translated Audio
              </button>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime -= 10;
                  }
                }}
                className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                  />
                </svg>
              </button>
              <button
                onClick={togglePlayPause}
                className="p-4 bg-saas-yellow rounded-full hover:bg-yellow-400 transition-colors"
              >
                {isPlaying ? (
                  <svg
                    className="w-8 h-8 text-black"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-black"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime += 10;
                  }
                }}
                className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
