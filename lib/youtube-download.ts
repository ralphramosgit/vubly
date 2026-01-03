/**
 * Third-party YouTube download services
 * These bypass YouTube's bot detection by using external services
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

/**
 * Download via ssyoutube (most reliable free option)
 */
export async function downloadAudioViaSSYoutube(videoId: string): Promise<Buffer> {
  console.log(`[SSYoutube] Downloading audio for ${videoId}...`);
  
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Step 1: Get download page
  const pageResponse = await fetch(`https://ssyoutube.com/api/convert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://ssyoutube.com',
      'Referer': 'https://ssyoutube.com/',
    },
    body: `url=${encodeURIComponent(youtubeUrl)}`,
  });

  if (!pageResponse.ok) {
    throw new Error(`SSYoutube failed: ${pageResponse.status}`);
  }

  const data = await pageResponse.json();
  
  // Find MP3/audio link
  const audioUrl = data.url || data.audio?.url || data.links?.audio?.[0]?.url;
  
  if (!audioUrl) {
    throw new Error('SSYoutube: No audio URL in response');
  }

  console.log(`[SSYoutube] Got audio URL, downloading...`);
  
  const audioResponse = await fetch(audioUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!audioResponse.ok) {
    throw new Error(`SSYoutube download failed: ${audioResponse.status}`);
  }

  const arrayBuffer = await audioResponse.arrayBuffer();
  console.log(`[SSYoutube] ✅ Downloaded ${arrayBuffer.byteLength} bytes`);
  return Buffer.from(arrayBuffer);
}

/**
 * Download via 9convert (popular, usually works)
 */
export async function downloadAudioVia9Convert(videoId: string): Promise<Buffer> {
  console.log(`[9Convert] Downloading audio for ${videoId}...`);
  
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Step 1: Analyze
  const analyzeResponse = await fetch('https://9convert.com/api/ajaxSearch/index', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://9convert.com',
      'Referer': 'https://9convert.com/',
    },
    body: `query=${encodeURIComponent(youtubeUrl)}&vt=mp3`,
  });

  if (!analyzeResponse.ok) {
    throw new Error(`9Convert analyze failed: ${analyzeResponse.status}`);
  }

  const analyzeData = await analyzeResponse.json();
  
  if (analyzeData.status !== 'ok') {
    throw new Error(`9Convert error: ${analyzeData.mess || 'Analysis failed'}`);
  }

  // Parse the HTML response to find the conversion key
  const html = analyzeData.result || '';
  const keyMatch = html.match(/k__id\s*=\s*["']([^"']+)["']/);
  
  if (!keyMatch) {
    // Try to find direct download link
    const linkMatch = html.match(/href=["'](https:\/\/[^"']+\.mp3[^"']*)["']/);
    if (linkMatch) {
      const audioResponse = await fetch(linkMatch[1]);
      if (audioResponse.ok) {
        const arrayBuffer = await audioResponse.arrayBuffer();
        console.log(`[9Convert] ✅ Downloaded ${arrayBuffer.byteLength} bytes`);
        return Buffer.from(arrayBuffer);
      }
    }
    throw new Error('9Convert: No conversion key found');
  }

  // Step 2: Convert
  const convertResponse = await fetch('https://9convert.com/api/ajaxConvert/convert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://9convert.com',
    },
    body: `vid=${videoId}&k=${encodeURIComponent(keyMatch[1])}`,
  });

  if (!convertResponse.ok) {
    throw new Error(`9Convert convert failed: ${convertResponse.status}`);
  }

  const convertData = await convertResponse.json();
  
  if (convertData.status !== 'ok' || !convertData.dlink) {
    throw new Error(`9Convert: ${convertData.mess || 'No download link'}`);
  }

  const audioResponse = await fetch(convertData.dlink);
  if (!audioResponse.ok) {
    throw new Error(`9Convert download failed: ${audioResponse.status}`);
  }

  const arrayBuffer = await audioResponse.arrayBuffer();
  console.log(`[9Convert] ✅ Downloaded ${arrayBuffer.byteLength} bytes`);
  return Buffer.from(arrayBuffer);
}

/**
 * Download via SaveTube API (free, no key required)
 */
export async function downloadAudioViaSaveTube(videoId: string): Promise<Buffer> {
  console.log(`[SaveTube] Downloading audio for ${videoId}...`);
  
  const response = await fetch(`https://api.savetube.me/info?url=https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`SaveTube info failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.data?.audio) {
    throw new Error('No audio formats available');
  }

  // Get best audio quality
  const audioFormats = data.data.audio;
  const bestAudio = audioFormats[0];
  
  if (!bestAudio?.url) {
    throw new Error('No audio URL found');
  }

  console.log(`[SaveTube] Downloading audio (${bestAudio.quality || 'unknown'})...`);
  
  const audioResponse = await fetch(bestAudio.url);
  if (!audioResponse.ok) {
    throw new Error(`SaveTube download failed: ${audioResponse.status}`);
  }

  const arrayBuffer = await audioResponse.arrayBuffer();
  console.log(`[SaveTube] ✅ Downloaded ${arrayBuffer.byteLength} bytes`);
  return Buffer.from(arrayBuffer);
}

/**
 * Download via loader.to API (free, no key required)
 */
export async function downloadAudioViaLoaderTo(videoId: string): Promise<Buffer> {
  console.log(`[LoaderTo] Downloading audio for ${videoId}...`);
  
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Step 1: Request conversion
  const initResponse = await fetch('https://loader.to/ajax/download.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: `format=mp3&url=${encodeURIComponent(youtubeUrl)}`,
  });

  if (!initResponse.ok) {
    throw new Error(`LoaderTo init failed: ${initResponse.status}`);
  }

  const initData = await initResponse.json();
  
  if (!initData.id) {
    throw new Error(`LoaderTo error: ${initData.error || 'No conversion ID'}`);
  }

  console.log(`[LoaderTo] Conversion started, ID: ${initData.id}`);

  // Step 2: Poll for completion
  let attempts = 0;
  const maxAttempts = 60;
  
  while (attempts < maxAttempts) {
    const progressResponse = await fetch(`https://loader.to/ajax/progress.php?id=${initData.id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!progressResponse.ok) {
      throw new Error(`LoaderTo progress failed: ${progressResponse.status}`);
    }

    const progressData = await progressResponse.json();
    
    if (progressData.success === 1 && progressData.download_url) {
      console.log(`[LoaderTo] Conversion complete, downloading...`);
      
      const audioResponse = await fetch(progressData.download_url);
      if (!audioResponse.ok) {
        throw new Error(`LoaderTo download failed: ${audioResponse.status}`);
      }

      const arrayBuffer = await audioResponse.arrayBuffer();
      console.log(`[LoaderTo] ✅ Downloaded ${arrayBuffer.byteLength} bytes`);
      return Buffer.from(arrayBuffer);
    }

    if (progressData.error) {
      throw new Error(`LoaderTo error: ${progressData.error}`);
    }

    attempts++;
    console.log(`[LoaderTo] Converting... ${progressData.progress || 0}%`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('LoaderTo conversion timed out');
}

/**
 * Download via YTMP3 API (free, no key)
 */
export async function downloadAudioViaYTMP3(videoId: string): Promise<Buffer> {
  console.log(`[YTMP3] Downloading audio for ${videoId}...`);
  
  // Use a simple YTMP3-like service
  const apiUrl = `https://www.yt-download.org/api/button/mp3/${videoId}`;
  
  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`YTMP3 API failed: ${response.status}`);
  }

  const html = await response.text();
  
  // Extract download link from HTML response
  const linkMatch = html.match(/href="(https:\/\/[^"]+\.mp3[^"]*)"/);
  if (!linkMatch) {
    throw new Error('YTMP3: No download link found');
  }

  console.log(`[YTMP3] Got download link, fetching audio...`);
  
  const audioResponse = await fetch(linkMatch[1], {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!audioResponse.ok) {
    throw new Error(`YTMP3 download failed: ${audioResponse.status}`);
  }

  const arrayBuffer = await audioResponse.arrayBuffer();
  console.log(`[YTMP3] ✅ Downloaded ${arrayBuffer.byteLength} bytes`);
  return Buffer.from(arrayBuffer);
}

/**
 * Download YouTube audio as MP3 using RapidAPI YouTube MP3 service
 * Free tier: 150 requests/month
 */
export async function downloadAudioViaRapidAPI(
  videoId: string
): Promise<Buffer> {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY environment variable is not set");
  }

  console.log(`[RapidAPI] Downloading audio for ${videoId}...`);
  const RAPIDAPI_HOST = "youtube-mp36.p.rapidapi.com";

  // Poll until we get the MP3 link
  let attempts = 0;
  const maxAttempts = 30; // Max 30 seconds of polling

  while (attempts < maxAttempts) {
    const response = await fetch(`https://${RAPIDAPI_HOST}/dl?id=${videoId}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(
        `RapidAPI request failed: ${response.status} ${response.statusText}`
      );
    }

    interface MP3Response {
      link: string;
      title: string;
      msg: string;
      status: "ok" | "processing" | "fail";
    }
    
    const data: MP3Response = await response.json();
    console.log(`[RapidAPI] Response status: ${data.status}`);

    if (data.status === "ok" && data.link) {
      console.log(`[RapidAPI] Got MP3 link: ${data.link.substring(0, 50)}...`);

      // Download the actual MP3 file with browser-like headers (required for whitelist)
      const mp3Response = await fetch(data.link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://youtube-mp36.p.rapidapi.com/',
        },
      });
      
      if (!mp3Response.ok) {
        console.log(`[RapidAPI] MP3 download failed with ${mp3Response.status}, trying redirect...`);
        // Some services return redirects, try following manually
        const location = mp3Response.headers.get('location');
        if (location) {
          const redirectResponse = await fetch(location, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          if (redirectResponse.ok) {
            const arrayBuffer = await redirectResponse.arrayBuffer();
            console.log(`[RapidAPI] ✅ Downloaded ${arrayBuffer.byteLength} bytes (via redirect)`);
            return Buffer.from(arrayBuffer);
          }
        }
        throw new Error(`Failed to download MP3: ${mp3Response.status}`);
      }

      const arrayBuffer = await mp3Response.arrayBuffer();
      console.log(`[RapidAPI] ✅ Downloaded ${arrayBuffer.byteLength} bytes`);
      return Buffer.from(arrayBuffer);
    }

    if (data.status === "fail") {
      throw new Error(
        `RapidAPI conversion failed: ${data.msg || "Unknown error"}`
      );
    }

    // Status is 'processing', wait and retry
    attempts++;
    console.log(`[RapidAPI] Processing... attempt ${attempts}/${maxAttempts}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("RapidAPI conversion timed out");
}

/**
 * Alternative: Use y2mate API (no key required, but less reliable)
 */
export async function downloadAudioViaY2mate(videoId: string): Promise<Buffer> {
  console.log(`[Y2mate] Downloading audio for ${videoId}...`);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Step 1: Analyze the video
  const analyzeResponse = await fetch(
    "https://www.y2mate.com/mates/analyzeV2/ajax",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: `k_query=${encodeURIComponent(youtubeUrl)}&k_page=home&hl=en&q_auto=0`,
    }
  );

  if (!analyzeResponse.ok) {
    throw new Error(`Y2mate analyze failed: ${analyzeResponse.status}`);
  }

  const analyzeData = await analyzeResponse.json();

  if (analyzeData.status !== "ok") {
    throw new Error(
      `Y2mate analyze error: ${analyzeData.mess || "Unknown error"}`
    );
  }

  // Find MP3 128kbps option
  const mp3Links = analyzeData.links?.mp3;
  if (!mp3Links) {
    throw new Error("No MP3 options available");
  }

  // Get the first available MP3 quality
  const mp3Key = Object.keys(mp3Links)[0];
  const mp3Info = mp3Links[mp3Key];

  console.log(`[Y2mate] Converting to MP3 (${mp3Info.q})...`);

  // Step 2: Convert to MP3
  const convertResponse = await fetch(
    "https://www.y2mate.com/mates/convertV2/index",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: `vid=${videoId}&k=${encodeURIComponent(mp3Info.k)}`,
    }
  );

  if (!convertResponse.ok) {
    throw new Error(`Y2mate convert failed: ${convertResponse.status}`);
  }

  const convertData = await convertResponse.json();

  if (convertData.status !== "ok" || !convertData.dlink) {
    throw new Error(
      `Y2mate conversion error: ${convertData.mess || "No download link"}`
    );
  }

  console.log(`[Y2mate] Downloading MP3...`);

  // Step 3: Download the MP3
  const mp3Response = await fetch(convertData.dlink, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!mp3Response.ok) {
    throw new Error(`Y2mate download failed: ${mp3Response.status}`);
  }

  const arrayBuffer = await mp3Response.arrayBuffer();
  console.log(`[Y2mate] ✅ Downloaded ${arrayBuffer.byteLength} bytes`);
  return Buffer.from(arrayBuffer);
}

/**
 * Try multiple download methods in order
 */
export async function downloadYouTubeAudio(videoId: string): Promise<Buffer> {
  const methods: Array<{ name: string; fn: () => Promise<Buffer> }> = [
    { name: "9Convert", fn: () => downloadAudioVia9Convert(videoId) },
    { name: "SSYoutube", fn: () => downloadAudioViaSSYoutube(videoId) },
    { name: "SaveTube", fn: () => downloadAudioViaSaveTube(videoId) },
    { name: "LoaderTo", fn: () => downloadAudioViaLoaderTo(videoId) },
    { name: "YTMP3", fn: () => downloadAudioViaYTMP3(videoId) },
    { name: "Y2mate", fn: () => downloadAudioViaY2mate(videoId) },
  ];

  // Add RapidAPI if key is available (most reliable, put first)
  if (RAPIDAPI_KEY) {
    methods.unshift({ name: "RapidAPI", fn: () => downloadAudioViaRapidAPI(videoId) });
  }

  for (const method of methods) {
    try {
      console.log(`[Download] Trying ${method.name}...`);
      return await method.fn();
    } catch (error) {
      console.error(
        `[Download] ${method.name} failed:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  throw new Error("All download methods failed. Please try again later or use a different video.");
}
