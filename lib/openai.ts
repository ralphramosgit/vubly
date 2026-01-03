import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: Buffer) {
  // Save buffer to temp file (Whisper needs a file)
  // Use /tmp for Vercel serverless (read-only filesystem except /tmp)
  const tempDir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = path.join(tempDir, `audio-${Date.now()}.mp3`);
  fs.writeFileSync(tempPath, audioBuffer);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    return transcription;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

export async function detectLanguage(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Detect the language of this text and respond with ONLY the 2-letter ISO 639-1 code (e.g., 'en', 'es', 'fr'). Text: "${text.substring(0, 500)}"`,
      },
    ],
    max_tokens: 10,
    temperature: 0,
  });

  return response.choices[0].message.content?.trim().toLowerCase() || "en";
}
