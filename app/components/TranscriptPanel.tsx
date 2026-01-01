"use client";

interface TranscriptPanelProps {
  title: string;
  content?: string;
}

export default function TranscriptPanel({
  title,
  content,
}: TranscriptPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-saas-yellow font-bold text-lg mb-3">{title}</h3>
      <div className="flex-1 bg-white/95 rounded-2xl p-6 shadow-lg min-h-[200px]">
        <p className="text-black text-sm leading-relaxed">
          {content || "Transcript will appear here..."}
        </p>
      </div>
    </div>
  );
}
