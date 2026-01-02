# Vubly - YouTube Video Translation App

Translate YouTube videos into any language with AI voices using OpenAI, Claude, and ElevenLabs.

## 🎯 Features

- 🎥 **YouTube Video Processing**: Extract audio from any YouTube video
- 🎤 **AI Transcription**: OpenAI Whisper transcribes the audio with timestamps
- 🌍 **Language Detection**: Automatically detects the source language
- 🔄 **AI Translation**: Claude translates with context awareness
- 🗣️ **Text-to-Speech**: ElevenLabs generates natural-sounding voices
- ⚡ **Real-time Updates**: Dashboard updates automatically during processing
- 💾 **Session Management**: In-memory session storage for fast access

## 🏗️ Architecture

### Next.js Handles:

- YouTube video download and audio extraction
- OpenAI Whisper transcription
- Language detection
- Session management
- User interface

### Make.com Handles:

- Claude AI translation
- Claude AI reasoning/improvement
- ElevenLabs text-to-speech
- Workflow orchestration

## 📋 Prerequisites

- Node.js 18+ installed
- API Keys:
  - OpenAI API key
  - Anthropic (Claude) API key
  - ElevenLabs API key
  - YouTube Data API key
  - Make.com account (free tier works)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd vubly
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
OPENAI_API_KEY="sk-proj-..."
ANTHROPIC_API_KEY="sk-ant-api03-..."
ELEVENLABS_API_KEY="sk_..."
YOUTUBE_API_KEY="AIza..."
MAKE_WEBHOOK_URL="https://hook.us1.make.com/..."
```

### 3. Set Up Make.com Workflow

Follow the detailed guide in [MAKE_COM_SETUP.md](./MAKE_COM_SETUP.md)

**Quick steps:**

1. Create a new scenario in Make.com
2. Add 5 modules: Webhook → Claude Translate → Claude Reasoning → ElevenLabs → Webhook Response
3. Copy the webhook URL and add it to your `.env` file

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 How It Works

### User Flow:

1. **Video Input** (`/videoInput`)
   - User pastes YouTube URL
   - Selects target language and AI voice
   - Clicks "START"

2. **Processing** (Backend)
   - Extracts video ID
   - Downloads audio from YouTube
   - Transcribes with OpenAI Whisper
   - Detects source language
   - Sends to Make.com webhook

3. **Make.com Workflow**
   - Claude translates the transcript
   - Claude improves translation for natural speech
   - ElevenLabs generates audio
   - Returns to Next.js

4. **Dashboard** (`/dashboard`)
   - Shows YouTube video embed
   - Toggle between original/translated audio
   - View original and translated transcripts

## 📁 Project Structure

```
vubly/
├── app/
│   ├── api/
│   │   ├── process/route.ts          # Main processing endpoint
│   │   ├── session/[id]/route.ts     # Session status endpoint
│   │   └── audio/[sessionId]/[type]/ # Audio serving endpoint
│   ├── components/
│   │   ├── VideoPlayback.tsx         # Video player with audio controls
│   │   ├── TranscriptPanel.tsx       # Transcript display
│   │   └── ...
│   ├── dashboard/page.tsx            # Results dashboard
│   ├── videoInput/page.tsx           # Video input form
│   └── ...
├── lib/
│   ├── youtube.ts                    # YouTube download utilities
│   ├── openai.ts                     # OpenAI Whisper integration
│   ├── makecom.ts                    # Make.com webhook client
│   └── session.ts                    # Session management
├── .env                              # Environment variables
├── MAKE_COM_SETUP.md                 # Make.com setup guide
└── package.json
```

## 🔧 API Routes

### POST `/api/process`

Starts video processing

```json
{
  "youtubeUrl": "https://youtube.com/watch?v=...",
  "targetLanguage": "es",
  "voiceId": "21m00Tcm4TlvDq8ikWAM"
}
```

### GET `/api/session/[id]`

Gets processing status

```json
{
  "id": "session_...",
  "status": "processing|completed|error",
  "videoInfo": {...},
  "transcript": "...",
  "translatedText": "..."
}
```

### GET `/api/audio/[sessionId]/[type]`

Serves audio files

- Type: `original` or `translated`
- Returns: `audio/mpeg` binary

## 🎨 Available Voices

- Rachel (Female, American)
- Adam (Male, American)
- Antoni (Male, British)
- Bella (Female, American)

Add more voices by updating `VOICE_OPTIONS` in [videoInput/page.tsx](app/videoInput/page.tsx)

## 🌍 Supported Languages

- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)

Add more by updating `LANGUAGE_OPTIONS` in [videoInput/page.tsx](app/videoInput/page.tsx)

## 📊 Session Management

Sessions are stored in memory and automatically cleaned up after 1 hour. Each session contains:

- Video metadata
- Original audio
- Transcript
- Translated text
- Translated audio
- Processing status

**Production Note**: Replace in-memory storage with Redis or a database for production use.

## 🐛 Troubleshooting

### "Invalid YouTube URL"

- Make sure the URL includes the video ID
- Supported formats:
  - `https://youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`

### Processing takes too long

- Large videos (>10 minutes) take longer
- Check Make.com scenario execution
- Verify API rate limits aren't exceeded

### "MAKE_WEBHOOK_URL not configured"

- Add webhook URL to `.env` file
- Restart the dev server after updating `.env`

### Audio not playing

- Check browser console for errors
- Verify session status is "completed"
- Try refreshing the page

## 🚦 Testing

### Test with a short video:

1. Go to `/videoInput`
2. Use this test video: `https://youtube.com/watch?v=dQw4w9WgXcQ`
3. Select Spanish as target language
4. Click START
5. Wait 2-3 minutes for processing
6. View results on dashboard

## 📈 Performance

- Short videos (< 3 min): ~2-3 minutes to process
- Medium videos (3-10 min): ~3-5 minutes to process
- Long videos (> 10 min): ~5-10 minutes to process

Processing time depends on:

- Video length
- Audio quality
- API response times
- Translation complexity

## 🔒 Security Notes

- API keys are stored in `.env` (never commit this file!)
- Sessions expire after 1 hour
- All API calls are server-side (keys never exposed to client)
- Use environment variables in production

## 📝 TODO / Future Enhancements

- [ ] Add audio synchronization with video timestamps
- [ ] Support subtitle generation (SRT/VTT)
- [ ] Add user authentication
- [ ] Persistent storage (database)
- [ ] Progress indicators for each step
- [ ] Support for batch processing
- [ ] Download translated audio
- [ ] Custom voice cloning
- [ ] Multiple language outputs

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 💬 Support

For issues and questions:

1. Check [MAKE_COM_SETUP.md](./MAKE_COM_SETUP.md) for Make.com configuration
2. Review Next.js terminal logs
3. Check Make.com scenario execution history
4. Verify all API keys are valid

---

Built with ❤️ using Next.js, OpenAI, Claude, and ElevenLabs
