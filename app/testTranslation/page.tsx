"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

export default function TestTranslationPage() {
  const [text, setText] = useState("Hello, this is a test translation.");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [voiceId, setVoiceId] = useState("zl7szWVBXnpgrJmAalgz"); // Lily
  const [sessionId, setSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateSessionId = () => {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setAudioUrl(null);

    const testSessionId = sessionId || generateSessionId();
    setSessionId(testSessionId);

    try {
      // Get the base URL and callback URL
      const baseUrl = window.location.origin;
      const callbackUrl = `${baseUrl}/api/makecom-callback`;

      // Prepare the payload
      const payload = {
        sessionId: testSessionId,
        transcript: text,
        detectedLanguage,
        targetLanguage,
        voiceId,
        callbackUrl,
      };

      console.log("Sending payload:", payload);

      // Get the webhook URL from environment (we'll need to expose this)
      const response = await fetch("/api/test-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send webhook");
      }

      setResult(data);

      // Start polling for the result
      pollForResult(testSessionId);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setIsLoading(false);
    }
  };

  const pollForResult = async (sid: string) => {
    const maxAttempts = 60; // Poll for up to 60 seconds
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/session/${sid}?includeAudio=true`);
        const data = await response.json();

        if (data.status === "completed" && data.translatedAudio) {
          // Convert buffer to audio URL
          const audioBlob = new Blob(
            [new Uint8Array(data.translatedAudio.data)],
            {
              type: "audio/mpeg",
            }
          );
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          setResult(data);
          setIsLoading(false);
          return;
        } else if (data.status === "error") {
          setError(data.error || "Processing failed");
          setIsLoading(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setError("Timeout: No response received from Make.com");
          setIsLoading(false);
        }
      } catch (err: any) {
        setError(err.message || "Failed to check status");
        setIsLoading(false);
      }
    };

    poll();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Test Make.com Translation Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="text">Text to Translate</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to translate..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="detectedLanguage">Detected Language</Label>
              <Select
                value={detectedLanguage}
                onValueChange={setDetectedLanguage}
              >
                <SelectTrigger id="detectedLanguage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetLanguage">Target Language</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger id="targetLanguage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voiceId">Voice ID (ElevenLabs)</Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger id="voiceId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zl7szWVBXnpgrJmAalgz">Lily</SelectItem>
                <SelectItem value="gUABw7pXQjhjt0kNFBTF">Andrew</SelectItem>
                <SelectItem value="tnSpp4vdxKPjI9w0GnoV">Hope</SelectItem>
                <SelectItem value="NNl6r8mD7vthiJatiJt1">Bradford</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionId">
              Session ID (optional - auto-generated if empty)
            </Label>
            <Input
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Leave empty to auto-generate"
            />
          </div>

          <Button onClick={handleTest} disabled={isLoading} className="w-full">
            {isLoading ? "Processing..." : "Test Webhook"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Status:</strong> {result.status}
                  </p>
                  <p>
                    <strong>Session ID:</strong> {result.sessionId || sessionId}
                  </p>
                  {result.translatedText && (
                    <p>
                      <strong>Translation:</strong> {result.translatedText}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {audioUrl && (
            <div className="space-y-2">
              <Label>Translated Audio</Label>
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {isLoading && (
            <div className="text-center text-muted-foreground">
              Waiting for Make.com to process and return audio...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
