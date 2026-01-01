"use client";

import { useState } from "react";
import { Button } from "../components/ui/button";

export default function VideoUpload() {
  const [youtubeLink, setYoutubeLink] = useState("");

  const handleStart = () => {
    // if (youtubeLink.trim()) {
    //   // Navigate to dashboard
    //   window.location.href = "/dashboard";
    // }

    window.location.href = "/dashboard";
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

          {/* Input and Button */}
          <div className="w-full max-w-3xl space-y-6">
            <div className="relative">
              <input
                type="text"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="www.youtube.com/...."
                className="w-full px-8 py-5 text-lg rounded-2xl bg-white/95 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-saas-yellow shadow-lg shadow-saas-yellow/20 transition-all duration-200"
              />
            </div>
            <div className="flex justify-center">
              <Button
                onClick={handleStart}
                className="bg-saas-yellow hover:bg-[#E6E600] text-black font-bold text-xl px-20 py-7 rounded-2xl transition-all duration-200 shadow-lg shadow-saas-yellow/30 hover:shadow-saas-yellow/50"
              >
                START
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
