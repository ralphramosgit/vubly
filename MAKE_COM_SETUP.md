# Make.com Webhook Setup Guide

## Overview

Your Next.js app handles:

- ✅ YouTube video download
- ✅ Audio extraction
- ✅ OpenAI Whisper transcription
- ✅ Language detection

Make.com handles:

- 🔄 Claude AI translation
- 🔄 Claude AI reasoning/improvement
- 🔄 ElevenLabs text-to-speech
- 🔄 Sending results back

---

## Make.com Scenario Setup (Step by Step)

### Step 1: Create New Scenario

1. Go to Make.com and log in
2. Click **"Scenarios"** in the left sidebar
3. Click **"+ Create a new scenario"**
4. You'll see a blank canvas

---

### Module 1: Webhook Trigger

1. Click the **"+"** button in the center
2. Search for: **"Webhooks"**
3. Select: **"Custom webhook"**
4. Click **"Add"** next to the webhook dropdown
5. Name it: **"Vubly Translation Webhook"**
6. Click **"Save"**
7. **COPY THE WEBHOOK URL** (starts with `https://hook.us1.make.com/...`)
8. Save this URL - you'll add it to your `.env` file!
9. Click **"OK"**

**The webhook will receive:**

```json
{
  "transcript": "Full transcribed text...",
  "detectedLanguage": "en",
  "targetLanguage": "es",
  "voiceId": "21m00Tcm4TlvDq8ikWAM"
}
```

---

### Module 2: HTTP - Claude Translate

1. Click the **"+"** after the Webhook module
2. Search: **"HTTP"**
3. Select: **"Make a request"**

**Configuration:**

- **URL:** `https://api.anthropic.com/v1/messages`
- **Method:** `POST`

**Headers (click "+ Add item" THREE times):**

1. Name: `x-api-key` | Value: `YOUR_ANTHROPIC_API_KEY`
2. Name: `anthropic-version` | Value: `2023-06-01`
3. Name: `Content-Type` | Value: `application/json`

**Body type:** `Raw`
**Content type:** `JSON (application/json)`

**Request content:**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4000,
  "messages": [
    {
      "role": "user",
      "content": "Translate this text from {{1.detectedLanguage}} to {{1.targetLanguage}}. Maintain natural flow and timing for speech. Only output the translation:\n\n{{1.transcript}}"
    }
  ]
}
```

**Parse response:** `Yes`

Click **"OK"**

---

### Module 3: HTTP - Claude Reasoning (Improvement)

1. Click **"+"** after Claude Translate
2. Search: **"HTTP"**
3. Select: **"Make a request"**

**Configuration (same as Module 2):**

- **URL:** `https://api.anthropic.com/v1/messages`
- **Method:** `POST`
- **Headers:** Same 3 headers as Module 2

**Request content:**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 2000,
  "messages": [
    {
      "role": "user",
      "content": "Review this translation and improve it for natural spoken delivery. Output only the improved translation:\n\n{{2.data.content[0].text}}"
    }
  ]
}
```

**Parse response:** `Yes`

Click **"OK"**

---

### Module 4: HTTP - ElevenLabs TTS

1. Click **"+"** after Claude Reasoning
2. Search: **"HTTP"**
3. Select: **"Make a request"**

**Configuration:**

- **URL:** `https://api.elevenlabs.io/v1/text-to-speech/{{1.voiceId}}`
  - Type this exactly, the `{{1.voiceId}}` will map from the webhook
- **Method:** `POST`

**Headers (click "+ Add item" TWO times):**

1. Name: `xi-api-key` | Value: `YOUR_ELEVENLABS_API_KEY`
2. Name: `Content-Type` | Value: `application/json`

**Body type:** `Raw`
**Content type:** `JSON (application/json)`

**Request content:**

```json
{
  "text": "{{3.data.content[0].text}}",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

**Parse response:** `No` (because it returns audio binary data)

Click **"OK"**

---

### Module 5: HTTP - Send to Next.js Callback

1. Click **"+"** after ElevenLabs
2. Search: **"HTTP"**
3. Select: **"Make a request"**

**Configuration:**

- **URL:** `https://YOUR_NEXTJS_APP_URL/api/makecom-callback`
  - For local testing, use ngrok: `https://abc123.ngrok.io/api/makecom-callback`
  - For production, use your deployed URL
- **Method:** `POST`

**Headers (click "+ Add item"):**

1. Name: `Content-Type` | Value: `application/json`

**Body type:** `Raw`
**Content type:** `JSON (application/json)`

**Request content:**

```json
{
  "sessionId": "{{1.sessionId}}",
  "translation": "{{3.data.content[0].text}}",
  "audioData": "{{base64(4.data)}}"
}
```

**IMPORTANT**: Use `{{3.data.content[0].text}}` with `[0]` to get the first content item, not `{{3.data.content[].text}}`

Click **"OK"**

---

### Module 6: Webhook Response

1. Click **"+"** after the HTTP callback module
2. Search: **"Webhook"**
3. Select: **"Webhook Response"**

**Configuration:**

- **Status:** `200`

**Body:**

```json
{
  "success": true,
  "message": "Processing started"
}
```

**Headers (click "+ Add item"):**

- Name: `Content-Type` | Value: `application/json`

Click **"OK"**

---

## Final Steps

### Save and Activate

1. Click **"Save"** (bottom left, disk icon)
2. Name it: **"Vubly Translation Workflow"**
3. Toggle it **ON** (switch at bottom left)

### Test the Scenario

1. Click **"Run once"** (bottom left, play button)
2. The webhook will wait for data
3. Test from your Next.js app by submitting a video!

---

## Update Your .env File

After creating the webhook in Module 1, copy the URL and add it to your `.env` file:

```bash
MAKE_WEBHOOK_URL="https://hook.us1.make.com/YOUR_ACTUAL_WEBHOOK_URL"
```

---

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    NEXT.JS APP                          │
├─────────────────────────────────────────────────────────┤
│ 1. User inputs YouTube URL                              │
│ 2. Extract video ID                                     │
│ 3. Download audio from YouTube                          │
│ 4. Send audio to OpenAI Whisper API                     │
│ 5. Get transcript + detect language                     │
│ 6. Send to Make.com webhook ────────────────┐           │
└─────────────────────────────────────────────┼───────────┘
                                              ↓
┌─────────────────────────────────────────────────────────┐
│                    MAKE.COM WORKFLOW                     │
├─────────────────────────────────────────────────────────┤
│ MODULE 1: Webhook Trigger                               │
│    ↓                                                     │
│ MODULE 2: Claude Translate                              │
│    ↓                                                     │
│ MODULE 3: Claude Reasoning                              │
│    ↓                                                     │
│ MODULE 4: ElevenLabs TTS                                │
│    ↓                                                     │
│ MODULE 5: HTTP callback to Next.js                      │
│    ↓                                                     │
│ MODULE 6: Webhook Response (ack) ───────────┐           │
└─────────────────────────────────────────────┼───────────┘
                                              ↓
┌─────────────────────────────────────────────────────────┐
│                    NEXT.JS APP                          │
├─────────────────────────────────────────────────────────┤
│ 7. Receive translated audio at /api/makecom-callback   │
│ 8. Store in memory (session-based)                     │
│ 9. Display video player with both audio tracks         │
│ 10. User toggles between original & translated         │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Common Issues

1. **"MAKE_WEBHOOK_URL not configured"**
   - Make sure you added the webhook URL to `.env.local`
   - Restart your Next.js dev server after updating `.env.local`

2. **Make.com shows error on Claude modules**
   - Check that your Anthropic API key is correct
   - Make sure you have API credits
   - Verify you're using `{{2.data.content[0].text}}` with `[0]`, not `[].text`

3. **ElevenLabs returns error**
   - Verify your ElevenLabs API key
   - Check you have available character quota
   - Make sure the text input uses `{{3.data.content[0].text}}`

4. **Getting `[null]` for audioData**
   - Check that Module 4 (ElevenLabs) is set to **Parse response: No**
   - Verify the `base64(4.data)` function in Module 5 references the correct module number
   - Make sure ElevenLabs returned binary audio data successfully

5. **No callback received at Next.js**
   - Verify Module 5 has the correct callback URL
   - For local testing, make sure ngrok is running and the URL is correct
   - Check Next.js terminal for incoming requests
   - Verify your Next.js app is running and accessible

6. **Timeout errors**
   - Translation can take 1-3 minutes
   - Check Make.com execution history to see where it's stuck
   - Verify all API keys are working

7. **Webhook returns only "Accepted"**

- This is expected; the HTTP callback module sends the real payload
- Watch for a POST hitting `/api/makecom-callback` in your Next.js logs
- Ensure Module 5 (HTTP) points to the correct callback URL

### Testing Tips

1. Start with a short YouTube video (< 2 minutes)
2. Watch the Make.com scenario execution in real-time
3. Check the logs in your Next.js terminal
4. Each module in Make.com will show green checkmarks when successful
5. Click on each module to see its input/output data

### Debugging Module 4 (ElevenLabs)

If Module 4 shows success but you're getting `[null]` for audioData:

1. Click on Module 4 in the execution history
2. Look at the "Output" tab
3. You should see binary data, not JSON
4. If you see an error message, your ElevenLabs API key or quota is the issue
5. Make sure **Parse response** is set to **No**

### Local Testing with ngrok

For local development, you need to expose your localhost to the internet:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, start ngrok
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and:

1. Update Module 5 in Make.com to use `https://abc123.ngrok.io/api/makecom-callback`
2. Test your workflow

---

## API Keys Required

Make sure you have these API keys configured:

- ✅ OpenAI API Key (for Whisper transcription)
- ✅ Anthropic API Key (for Claude translation)
- ✅ ElevenLabs API Key (for text-to-speech)
- ✅ YouTube API Key (for video metadata)
- ✅ Make.com Webhook URL (from the webhook module)

---

## What Each Module Does

| Module              | Purpose                       | Input                         | Output               |
| ------------------- | ----------------------------- | ----------------------------- | -------------------- |
| 1. Webhook          | Receives data from Next.js    | YouTube transcript + language | JSON data            |
| 2. Claude Translate | Translates to target language | Original transcript           | Translated text      |
| 3. Claude Reasoning | Improves translation quality  | Initial translation           | Improved translation |
| 4. ElevenLabs TTS   | Converts text to speech       | Final translation             | Audio binary data    |
| 5. Webhook Response | Sends results back to Next.js | Audio + translation           | JSON response        |

---

## Next Steps After Setup

1. ✅ Complete Make.com scenario setup
2. ✅ Copy webhook URL to `.env` file
3. ✅ Restart Next.js dev server
4. ✅ Test with a short YouTube video
5. ✅ Check dashboard for results

---

## Support

If you encounter issues:

1. Check Make.com scenario execution history
2. Review Next.js terminal logs
3. Verify all API keys are valid
4. Ensure webhook URL is correct in `.env`
