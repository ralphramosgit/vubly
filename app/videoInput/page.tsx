"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";

const VOICE_OPTIONS = [
  { id: "zl7szWVBXnpgrJmAalgz", name: "Lily" },
  { id: "gUABw7pXQjhjt0kNFBTF", name: "Andrew" },
  { id: "tnSpp4vdxKPjI9w0GnoV", name: "Hope" },
  { id: "NNl6r8mD7vthiJatiJt1", name: "Bradford" },
  { id: "EGuUcoitkhx73AvR1V3C", name: "Peter Griffin" },
];

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
];

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Client-side caption extraction using YouTube's timedtext API
async function fetchCaptionsClientSide(
  videoId: string
): Promise<string | null> {
  console.log("[Client] Fetching captions for:", videoId);

  try {
    // Try different caption URL patterns
    const captionUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US`,
    ];

    for (const url of captionUrls) {
      try {
        console.log("[Client] Trying caption URL:", url);
        const response = await fetch(url);

        if (response.ok) {
          const text = await response.text();
          if (text && text.length > 100 && text.includes("<text")) {
            // Parse XML caption format
            const transcript = parseXmlCaptions(text);
            if (transcript && transcript.length > 50) {
              console.log(
                "[Client] ✅ Got captions:",
                transcript.substring(0, 100)
              );
              return transcript;
            }
          }
        }
      } catch (e) {
        console.log("[Client] URL failed:", url);
      }
    }

    console.log("[Client] Direct API failed");
    return null;
  } catch (error) {
    console.error("[Client] Caption fetch error:", error);
    return null;
  }
}

function parseXmlCaptions(xml: string): string {
  // Parse YouTube's XML caption format
  const textMatches = xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
  const segments: string[] = [];

  for (const match of textMatches) {
    let text = match[1];
    // Decode HTML entities
    text = text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ");
    if (text.trim()) {
      segments.push(text.trim());
    }
  }

  return segments.join(" ");
}

export default function VideoUpload() {
  const router = useRouter();
  const [youtubeLink, setYoutubeLink] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [voiceId, setVoiceId] = useState("zl7szWVBXnpgrJmAalgz");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleStart = useCallback(async () => {
    if (!youtubeLink.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    const videoId = extractVideoId(youtubeLink);
    if (!videoId) {
      setError("Invalid YouTube URL");
      return;
    }

    setError("");
    setLoading(true);
    setStatus("Downloading video and transcribing with AI...");

    try {
      // NEW SIMPLIFIED WORKFLOW:
      // Just call /api/process which downloads via third-party + transcribes with Whisper
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: youtubeLink,
          targetLanguage,
          voiceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Processing failed");
      }

      // Redirect to dashboard with session ID
      router.push(`/dashboard?session=${data.sessionId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
      setStatus("");
    }
  }, [youtubeLink, targetLanguage, voiceId, router]);

  return (
    <div className="min-h-screen bg-saas-black text-white">
      <div className="container mx-auto px-4">
        <div className="pt-32 pb-20 flex flex-col items-center">
          {/* Heading */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              Translate Your Video
            </h1>
            <p className="text-gray-400 text-lg">
              Paste your YouTube link below to get started
            </p>
          </div>

          {/* Input and Options */}
          <div className="w-full max-w-3xl space-y-6">
            {/* YouTube URL Input */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={youtubeLink}
                  onChange={(e) => {
                    setYoutubeLink(e.target.value);
                    setError("");
                    setStatus("");
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-8 py-5 text-lg rounded-2xl bg-white/95 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-saas-yellow shadow-lg shadow-saas-yellow/20 transition-all duration-200"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Language and Voice Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Language */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Translate to
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/95 text-black border-0 focus:outline-none focus:ring-2 focus:ring-saas-yellow"
                  disabled={loading}
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Voice */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI Voice
                </label>
                <select
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/95 text-black border-0 focus:outline-none focus:ring-2 focus:ring-saas-yellow"
                  disabled={loading}
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Message */}
            {status && (
              <div className="bg-blue-500/20 border border-blue-500 text-blue-300 px-4 py-3 rounded-lg">
                {status}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleStart}
                disabled={loading}
                className="bg-saas-yellow hover:bg-[#E6E600] text-black font-bold text-xl px-20 py-7 rounded-2xl transition-all duration-200 shadow-lg shadow-saas-yellow/30 hover:shadow-saas-yellow/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "PROCESSING..." : "START"}
              </Button>
            </div>

            {/* Processing Info */}
            {loading && (
              <div className="text-center text-gray-400 text-sm">
                <p>This may take a few minutes...</p>
                <p className="mt-2">
                  We&apos;re extracting captions and sending them for
                  translation.
                </p>
              </div>
            )}

            {/* Help Text */}
            <div className="text-center text-gray-500 text-sm mt-8">
              <p>
                💡 Make sure your video has captions enabled. Look for the{" "}
                <span className="font-mono bg-gray-800 px-1 rounded">CC</span>{" "}
                button on YouTube.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
