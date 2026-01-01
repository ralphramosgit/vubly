"use client";

import VideoPlayback from "../components/VideoPlayback";
import VolumeLevels from "../components/VolumeLevels";
import AudioSettings from "../components/AudioSettings";
import TranscriptPanel from "../components/TranscriptPanel";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-saas-black text-white">
      <div className="container mx-auto px-4 py-4 md:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Left Column - Volume Levels */}
          <div className="lg:col-span-2 order-3 lg:order-1">
            <VolumeLevels />
          </div>

          {/* Middle Column - Video and Transcripts */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-4 md:space-y-6">
            {/* Video Player */}
            <VideoPlayback />

            {/* Transcripts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <TranscriptPanel title="Original Language Transcript" />
              <TranscriptPanel title="Translated Language Transcript" />
            </div>
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
