interface MakeWebhookPayload {
  sessionId: string;
  transcript: string;
  detectedLanguage: string;
  targetLanguage: string;
  voiceId: string;
  callbackUrl: string;
}

export async function sendToMakeWebhook(
  payload: MakeWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("MAKE_WEBHOOK_URL not configured");
  }

  // Sanitize transcript to remove control characters that break JSON
  const sanitizedPayload = {
    ...payload,
    transcript: payload.transcript
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/\r\n/g, " ") // Replace Windows line breaks with space
      .replace(/[\r\n]/g, " ") // Replace Unix line breaks with space
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim(),
  };

  console.log("Sending to Make.com (async):", webhookUrl);
  console.log("Payload:", JSON.stringify(sanitizedPayload, null, 2));

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
