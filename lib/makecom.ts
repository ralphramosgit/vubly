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

  console.log("Sending to Make.com (async):", webhookUrl);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
