"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoInfo.duration || 0);
  const [ytReady, setYtReady] = useState(false);
  const [ytApiLoaded, setYtApiLoaded] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // Load YouTube IFrame API on mount
  useEffect(() => {
    if (status !== "completed") return;

    // Check if YouTube API is already loaded
    if (window.YT && window.YT.Player) {
      setYtApiLoaded(true);
      return;
    }

    // Load YouTube IFrame API script
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      console.log("[VideoPlayback] YouTube IFrame API ready");
      setYtApiLoaded(true);
    };

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [status]);

  // Initialize YouTube player
  useEffect(() => {
    if (!ytApiLoaded || !window.YT || !window.YT.Player) return;
    if (ytPlayerRef.current) return; // Already initialized

    const containerId = `yt-player-${videoInfo.id}`;

    // Create container div if it doesn't exist
    if (ytContainerRef.current && !document.getElementById(containerId)) {
      const div = document.createElement("div");
      div.id = containerId;
      div.style.width = "100%";
      div.style.height = "100%";
      ytContainerRef.current.appendChild(div);
    }

    console.log("[VideoPlayback] Initializing YouTube player for", videoInfo.id);

    ytPlayerRef.current = new window.YT.Player(containerId, {
      videoId: videoInfo.id,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          console.log("[VideoPlayback] YouTube player ready");
          event.target.mute(); // Always mute - we use our own audio
          const ytDuration = event.target.getDuration();
          if (ytDuration > 0) {
            setDuration(ytDuration);
          }
          setYtReady(true);
        },
        onStateChange: (event) => {
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            // Only sync audio if significantly out of sync (prevents looping)
            if (audioRef.current) {
              const ytTime = event.target.getCurrentTime();
              const audioTime = audioRef.current.currentTime;
              // Only resync if more than 1 second apart
              if (Math.abs(ytTime - audioTime) > 1) {
                audioRef.current.currentTime = ytTime;
              }
              // Only play if not already playing
              if (audioRef.current.paused) {
                audioRef.current.play().catch(console.error);
              }
            }
          } else if (state === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            audioRef.current?.pause();
          } else if (state === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            audioRef.current?.pause();
          }
        },
      },
    });

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [ytApiLoaded, videoInfo.id]);

  // Sync time updates
  useEffect(() => {
    if (!ytReady || !isPlaying) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      if (ytPlayerRef.current && audioRef.current) {
        const ytTime = ytPlayerRef.current.getCurrentTime();
        setCurrentTime(ytTime);

        // Keep audio in sync - only if more than 0.5s apart to prevent jitter
        const drift = Math.abs(ytTime - audioRef.current.currentTime);
        if (drift > 0.5 && drift < 10) {
          audioRef.current.currentTime = ytTime;
        }
      }
    }, 500);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [ytReady, isPlaying]);

  // Handle audio mode change - sync audio position
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (ytPlayerRef.current && ytReady) {
      audio.currentTime = ytPlayerRef.current.getCurrentTime();
    }

    if (isPlaying) {
      audio.play().catch(console.error);
    }
  }, [audioMode, isPlaying, ytReady]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);

      if (ytPlayerRef.current && ytReady) {
        ytPlayerRef.current.seekTo(time, true);
      }
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    },
    [ytReady]
  );

  const togglePlayPause = useCallback(() => {
    if (!ytPlayerRef.current || !ytReady) {
      // Fallback to audio-only if YouTube not ready
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play().catch(console.error);
          setIsPlaying(true);
        }
      }
      return;
    }

    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  }, [isPlaying, ytReady]);

  const isReady = ytReady || audioReady;

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Video Player */}
      <div className="aspect-video bg-black relative">
        {status === "completed" ? (
          <>
            {/* YouTube embed */}
            <div
              ref={ytContainerRef}
              className="w-full h-full"
              style={{ pointerEvents: "none" }}
            />

            {/* Clickable overlay */}
            <div
              className="absolute inset-0 cursor-pointer z-10"
              onClick={togglePlayPause}
            />

            {/* Loading spinner */}
            {!ytReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saas-yellow mx-auto mb-2"></div>
                  <p className="text-white text-sm">Loading video...</p>
                </div>
              </div>
            )}

            {/* Audio element */}
            <audio
              ref={audioRef}
              src={`/api/audio/${sessionId}/${audioMode}`}
              key={`${sessionId}-${audioMode}`}
              preload="auto"
              onLoadedMetadata={() => {
                console.log("[VideoPlayback] Audio metadata loaded");
                setAudioReady(true);
              }}
            />

            {/* Play overlay button */}
            {!isPlaying && ytReady && (
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-20"
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
                <p className="text-white font-medium">Processing video...</p>
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
        {status === "completed" && isReady && (
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
                  const newTime = Math.max(0, currentTime - 10);
                  setCurrentTime(newTime);
                  if (ytPlayerRef.current && ytReady) {
                    ytPlayerRef.current.seekTo(newTime, true);
                  }
                  if (audioRef.current) {
                    audioRef.current.currentTime = newTime;
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
                  const newTime = Math.min(duration, currentTime + 10);
                  setCurrentTime(newTime);
                  if (ytPlayerRef.current && ytReady) {
                    ytPlayerRef.current.seekTo(newTime, true);
                  }
                  if (audioRef.current) {
                    audioRef.current.currentTime = newTime;
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
