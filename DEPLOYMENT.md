# Vercel Deployment Checklist

## ✅ Environment Variables (Add in Vercel Dashboard)

Go to: https://vercel.com/ralph-ramos-projects/vubly/settings/environment-variables

Add these environment variables:

```
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
ELEVENLABS_API_KEY=sk_your-key-here
YOUTUBE_API_KEY=AIzaSy-your-key-here
MAKE_WEBHOOK_URL=https://hook.us2.make.com/evexdjahcmlm3a1z7ttuxclicuikmfv2
NEXT_PUBLIC_APP_URL=https://vubly.vercel.app
YTDL_NO_UPDATE=true
```

## ✅ Make.com Module 16 Configuration

Update Module 16 (HTTP - Make a request) in your Make.com scenario:

**URL:** `https://vubly.vercel.app/api/makecom-callback`

**Method:** POST

**Body type:** Raw

**Content type:** JSON (application/json)

**Request content:**

```json
{
  "sessionId": "{{1.sessionId}}",
  "translation": "{{14.Data.content[0].text}}",
  "audioData": "{{base64(15.Data)}}"
}
```

## ✅ What's Been Fixed for Production

1. **yt-dlp** - Now uses `yt-dlp-exec` npm package (works on Vercel Linux)
2. **ffmpeg** - Uses `@ffmpeg-installer/ffmpeg` package
3. **Temp files** - Proper cleanup even on errors to prevent /tmp filling up
4. **Session management** - Auto-cleanup of old sessions (>1 hour) to prevent memory leaks
5. **Environment detection** - Automatically uses correct paths for Windows dev vs Linux production
6. **Callback URL** - Uses production domain for Make.com callbacks

## ✅ Testing After Deployment

1. Go to https://vubly.vercel.app/videoInput
2. Enter a YouTube URL
3. Select target language and voice
4. Submit and wait for processing
5. Check dashboard shows video with translated audio

## 🚨 Known Limitations

- **In-memory storage**: Sessions stored in RAM (lost on cold starts). Consider Redis for production.
- **Vercel timeout**: Max 60 seconds for Hobby plan, 300 seconds for Pro. Make.com callback handles long processing.
- **/tmp size**: Limited to 512MB on Vercel. Videos over this size will fail.
- **Cold starts**: First request after inactivity may be slower.

## 📝 Monitoring

Check Vercel logs: https://vercel.com/ralph-ramos-projects/vubly/logs

Watch for:

- yt-dlp execution errors
- Temp file cleanup warnings
- Make.com callback failures
- Session storage issues
