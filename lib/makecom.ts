interface MakeWebhookPayload {
  sessionId: string;
  transcript: string;
  detectedLanguage: string;
  targetLanguage: string;
  voiceId: string;
  callbackUrl: string;
}

// Map language codes to full names for Claude AI
const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
  hi: "Hindi",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
};

function getLanguageName(code: string): string {
  return LANGUAGE_CODE_TO_NAME[code.toLowerCase()] || code;
}

export async function sendToMakeWebhook(
  payload: MakeWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("MAKE_WEBHOOK_URL not configured");
  }

  // Sanitize transcript and convert language codes to full names
  const sanitizedPayload = {
    ...payload,
    targetLanguage: getLanguageName(payload.targetLanguage),
    detectedLanguage: getLanguageName(payload.detectedLanguage),
    transcript: payload.transcript
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/\r\n/g, " ") // Replace Windows line breaks with space
      .replace(/[\r\n]/g, " ") // Replace Unix line breaks with space
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim(),
  };

  console.log("=== MAKE.COM WEBHOOK DEBUG ===");
  console.log("Webhook URL:", webhookUrl);
  console.log("Target Language being sent:", sanitizedPayload.targetLanguage);
  console.log("Voice ID being sent:", sanitizedPayload.voiceId);
  console.log("Full Payload:", JSON.stringify(sanitizedPayload, null, 2));
  console.log("==============================");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedPayload),
    });

    // We expect "Accepted" or similar response for async processing
    const text = await response.text();
    console.log("Make.com response:", text);

    return {
      success: true,
      message:
        "Webhook triggered successfully. Results will be sent to callback.",
    };
  } catch (error: unknown) {
    console.error("Failed to trigger Make.com webhook:", error);
    throw new Error(
      `Failed to trigger webhook: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
