/**
 * Third-party YouTube download service using RapidAPI
 * This bypasses YouTube's bot detection by using external services
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "youtube-mp36.p.rapidapi.com";

interface MP3Response {
  link: string;
  title: string;
  msg: string;
  status: "ok" | "processing" | "fail";
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

    const data: MP3Response = await response.json();
    console.log(`[RapidAPI] Response status: ${data.status}`);

    if (data.status === "ok" && data.link) {
      console.log(`[RapidAPI] Got MP3 link, downloading...`);

      // Download the actual MP3 file
      const mp3Response = await fetch(data.link);
      if (!mp3Response.ok) {
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
  const methods = [
    { name: "RapidAPI", fn: () => downloadAudioViaRapidAPI(videoId) },
    { name: "Y2mate", fn: () => downloadAudioViaY2mate(videoId) },
  ];

  // If no RapidAPI key, skip that method
  if (!RAPIDAPI_KEY) {
    methods.shift();
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

  throw new Error("All download methods failed");
}
