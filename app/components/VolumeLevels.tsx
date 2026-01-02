"use client";

import { useState } from "react";

export default function VolumeLevels() {
  const [originalVolume, setOriginalVolume] = useState(50);
  const [newVolume, setNewVolume] = useState(70);

  const verticalSliderStyle = {
    writingMode: "vertical-lr" as const,
    WebkitAppearance: "slider-vertical" as const,
    width: "8px",
  };

  return (
    <div className="border-2 border-saas-yellow rounded-3xl p-6 h-fit">
      <div className="flex gap-8 items-center justify-center h-80">
        {/* Original Volume */}
        <div className="flex flex-col items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={originalVolume}
            onChange={(e) => setOriginalVolume(Number(e.target.value))}
            className="h-64 slider-vertical"
            style={verticalSliderStyle}
          />
          <span className="text-white font-semibold">original</span>
        </div>

        {/* New Volume */}
        <div className="flex flex-col items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={newVolume}
            onChange={(e) => setNewVolume(Number(e.target.value))}
            className="h-64 slider-vertical"
            style={verticalSliderStyle}
          />
          <span className="text-white font-semibold">translated</span>
        </div>
      </div>
    </div>
  );
}
