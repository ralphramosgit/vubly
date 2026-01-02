"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";

const VOICE_OPTIONS = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Female, American)" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Male, American)" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Male, British)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Female, American)" },
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

export default function VideoUpload() {
  const router = useRouter();
  const [youtubeLink, setYoutubeLink] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    if (!youtubeLink.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setError("");
    setLoading(true);

    try {
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
    }
  };

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
            <div className="relative">
              <input
                type="text"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="www.youtube.com/...."
                className="w-full px-8 py-5 text-lg rounded-2xl bg-white/95 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-saas-yellow shadow-lg shadow-saas-yellow/20 transition-all duration-200"
                disabled={loading}
              />
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
                  We&apos;re downloading the audio, transcribing it, and translating
                  it for you.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
