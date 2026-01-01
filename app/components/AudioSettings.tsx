"use client";

import { useState } from "react";
import { Button } from "./ui/button";

export default function AudioSettings() {
  const [selectedVoice, setSelectedVoice] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState(0);

  const voices = Array(12).fill("voice 1");
  const languages = ["English", "Spanish", "French", "German", "Japanese"];

  return (
    <div className="border-2 border-saas-yellow rounded-3xl p-3 md:p-4 lg:p-6">
      {/* Voice Selection */}
      <div className="mb-3 md:mb-4">
        <div className="border-2 border-saas-yellow rounded-2xl p-2 md:p-3 mb-3">
          <h3 className="text-saas-yellow text-center font-bold mb-2 text-sm md:text-base">
            Voice
          </h3>
          <div className="grid grid-cols-4 gap-1.5 md:gap-2">
            {voices.map((voice, index) => (
              <button
                key={index}
                onClick={() => setSelectedVoice(index)}
                className={`flex flex-col items-center gap-1 p-1 md:p-1.5 rounded-lg transition-all ${
                  selectedVoice === index
                    ? "bg-saas-yellow/20"
                    : "hover:bg-saas-yellow/10"
                }`}
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full"></div>
                <span className="text-saas-yellow text-[10px] md:text-xs font-semibold">
                  {voice}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div className="border-2 border-saas-yellow rounded-2xl p-2 md:p-3 mb-3">
          <h3 className="text-saas-yellow text-center font-bold mb-2 text-sm md:text-base">
            Language
          </h3>
          <div className="space-y-1.5 md:space-y-2">
            {languages.map((language, index) => (
              <button
                key={index}
                onClick={() => setSelectedLanguage(index)}
                className={`w-full py-2 md:py-2.5 px-3 rounded-xl text-left font-medium transition-all text-sm md:text-base ${
                  selectedLanguage === index
                    ? "bg-white text-black"
                    : "bg-white/90 text-black hover:bg-white"
                }`}
              >
                {language}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <Button className="w-full bg-saas-yellow hover:bg-[#E6E600] text-black font-bold text-base md:text-lg py-4 md:py-5 rounded-2xl">
        Apply
      </Button>
    </div>
  );
}
