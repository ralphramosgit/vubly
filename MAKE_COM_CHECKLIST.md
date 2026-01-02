# Make.com Setup Checklist

## ✅ Before You Start

- [ ] You have a Make.com account (free tier works)
- [ ] You have these API keys ready:
  - [ ] Anthropic API key (for Claude)
  - [ ] ElevenLabs API key (for TTS)
  - [ ] OpenAI API key (for Whisper - already in Next.js)

---

## 🔧 Make.com Scenario Setup

### Module 1: Webhook Trigger

- [ ] Created "Custom webhook"
- [ ] Named it "Vubly Translation Webhook"
- [ ] **COPIED THE WEBHOOK URL**
- [ ] Added webhook URL to `.env.local` as `MAKE_WEBHOOK_URL=...`

### Module 2: HTTP - Claude Translate

- [ ] URL: `https://api.anthropic.com/v1/messages`
- [ ] Method: POST
- [ ] Added 3 headers (x-api-key, anthropic-version, Content-Type)
- [ ] Request body uses `{{1.transcript}}`, `{{1.detectedLanguage}}`, `{{1.targetLanguage}}`
- [ ] Parse response: **Yes**

### Module 3: HTTP - Claude Reasoning

- [ ] Same URL and headers as Module 2
- [ ] Request body uses `{{2.data.content[0].text}}` (note the `[0]`)
- [ ] Parse response: **Yes**

### Module 4: HTTP - ElevenLabs TTS

- [ ] URL: `https://api.elevenlabs.io/v1/text-to-speech/{{1.voiceId}}`
- [ ] Method: POST
- [ ] Added 2 headers (xi-api-key, Content-Type)
- [ ] Request body uses `{{3.data.content[0].text}}` (note the `[0]`)
- [ ] Parse response: **No** (IMPORTANT!)

### Module 5: HTTP - Send to Next.js Callback

- [ ] URL: Your Next.js callback endpoint
  - For local: `https://YOUR_NGROK_URL.ngrok.io/api/makecom-callback`
  - For production: `https://your-domain.com/api/makecom-callback`
- [ ] Method: POST
- [ ] Header: Content-Type: application/json
- [ ] Request body:
  ```json
  {
    "sessionId": "{{1.sessionId}}",
    "translation": "{{3.data.content[0].text}}",
    "audioData": "{{base64(4.data)}}"
  }
  ```

### Module 6: Webhook Response

- [ ] Status: 200
- [ ] Body: `{"success": true, "message": "Processing started"}`
- [ ] Header: Content-Type: application/json

---

## 💾 Save and Activate

- [ ] Clicked "Save" (disk icon, bottom left)
- [ ] Named scenario "Vubly Translation Workflow"
- [ ] Toggled scenario **ON** (switch at bottom left)

---

## 🧪 Testing

### For Local Development:

1. [ ] Start Next.js dev server: `npm run dev`
2. [ ] Start ngrok: `ngrok http 3000`
3. [ ] Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
4. [ ] Update Module 5 in Make.com with ngrok URL + `/api/makecom-callback`
5. [ ] Click "Run once" in Make.com
6. [ ] Submit a test video in your Next.js app

### Verify:

- [ ] Make.com shows "Waiting for webhook data..." after clicking "Run once"
- [ ] All modules turn green after successful execution
- [ ] Module 4 output shows binary data (not JSON)
- [ ] Module 5 successfully calls your Next.js callback
- [ ] Next.js terminal shows `[sessionId] Session updated successfully`

---

## 🐛 Common Issues

| Issue                      | Fix                                        |
| -------------------------- | ------------------------------------------ |
| `[null]` for audioData     | Module 4 must have **Parse response: No**  |
| "content[].text not found" | Change `[]` to `[0]` in Modules 3, 4, 5    |
| No callback received       | Check ngrok URL and Module 5 configuration |
| Claude API error           | Verify Anthropic API key and credits       |
| ElevenLabs error           | Verify ElevenLabs API key and quota        |

---

## 📝 Environment Variables

Your `.env.local` should have:

```bash
# OpenAI API Key (for Whisper transcription)
OPENAI_API_KEY=sk-...

# Make.com Webhook URL (from Module 1)
MAKE_WEBHOOK_URL=https://hook.us1.make.com/...
```

---

## ✨ Next Steps

After successful setup:

1. Test with a short YouTube video (< 2 min)
2. Monitor Make.com execution history
3. Check Next.js terminal logs
4. Verify audio output in the dashboard

---

## 🆘 Need Help?

1. Check Make.com execution history for errors
2. Click each module to see input/output
3. Review Next.js terminal for error messages
4. Verify all API keys are correct and have credits
