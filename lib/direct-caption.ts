// Direct caption extraction by parsing YouTube's page HTML
// This bypasses yt-dlp and uses direct HTTP requests with browser-like headers

export async function extractCaptionsDirectly(
  videoId: string
): Promise<string | null> {
  console.log(`[DirectCaption] Extracting captions for ${videoId}...`);

  try {
    // Step 1: Fetch the YouTube video page with browser-like headers
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      console.log(`[DirectCaption] Failed to fetch video page: ${response.status}`);
      return null;
    }

    const html = await response.text();
    console.log(`[DirectCaption] Got HTML page (${html.length} chars)`);

    // Step 2: Extract caption track URLs from the page
    // Look for "captionTracks" in the ytInitialPlayerResponse
    const captionTracksMatch = html.match(
      /"captionTracks":\s*(\[[\s\S]*?\])/
    );

    if (!captionTracksMatch) {
      console.log(`[DirectCaption] No captionTracks found in page`);
      
      // Try alternative pattern (without 's' flag for compatibility)
      const altMatch = html.match(/playerCaptionsTracklistRenderer[\s\S]*?captionTracks[\s\S]*?\[([\s\S]*?)\]/);
      if (!altMatch) {
        console.log(`[DirectCaption] No captions available for this video`);
        return null;
      }
    }

    // Parse the caption tracks JSON
    let captionTracks: any[] = [];
    try {
      // Try to extract the full captionTracks array
      const tracksJson = captionTracksMatch![1];
      captionTracks = JSON.parse(tracksJson);
      console.log(`[DirectCaption] Found ${captionTracks.length} caption tracks`);
    } catch (e) {
      // Try regex extraction of baseUrl
      const baseUrlMatches = html.matchAll(/"baseUrl"\s*:\s*"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/g);
      const urls = Array.from(baseUrlMatches, m => m[1].replace(/\\u0026/g, '&'));
      
      if (urls.length === 0) {
        console.log(`[DirectCaption] Could not parse caption URLs`);
        return null;
      }
      
      // Create pseudo track objects
      captionTracks = urls.map(url => ({ baseUrl: url }));
      console.log(`[DirectCaption] Extracted ${captionTracks.length} caption URLs via regex`);
    }

    if (captionTracks.length === 0) {
      console.log(`[DirectCaption] No caption tracks found`);
      return null;
    }

    // Step 3: Find English captions (prefer manual, then auto-generated)
    let captionUrl = null;
    
    // First try to find English manual captions
    for (const track of captionTracks) {
      const langCode = track.languageCode || '';
      const kind = track.kind || '';
      if (langCode.startsWith('en') && kind !== 'asr') {
        captionUrl = track.baseUrl;
        console.log(`[DirectCaption] Found manual English captions`);
        break;
      }
    }
    
    // Fall back to auto-generated
    if (!captionUrl) {
      for (const track of captionTracks) {
        const langCode = track.languageCode || '';
        if (langCode.startsWith('en')) {
          captionUrl = track.baseUrl;
          console.log(`[DirectCaption] Found auto-generated English captions`);
          break;
        }
      }
    }
    
    // Fall back to any caption
    if (!captionUrl && captionTracks[0]?.baseUrl) {
      captionUrl = captionTracks[0].baseUrl;
      console.log(`[DirectCaption] Using first available caption track`);
    }

    if (!captionUrl) {
      console.log(`[DirectCaption] No suitable caption URL found`);
      return null;
    }

    // Decode the URL (it may be escaped)
    captionUrl = captionUrl.replace(/\\u0026/g, '&');
    console.log(`[DirectCaption] Fetching captions from: ${captionUrl.substring(0, 100)}...`);

    // Step 4: Fetch the caption XML
    const captionResponse = await fetch(captionUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!captionResponse.ok) {
      console.log(`[DirectCaption] Failed to fetch captions: ${captionResponse.status}`);
      return null;
    }

    const captionXml = await captionResponse.text();
    console.log(`[DirectCaption] Got caption XML (${captionXml.length} chars)`);

    // Step 5: Parse the XML and extract text
    const transcript = parseTimedTextXml(captionXml);

    if (transcript && transcript.length > 50) {
      console.log(`[DirectCaption] ✅ Extracted ${transcript.length} chars of transcript`);
      console.log(`[DirectCaption] Preview: ${transcript.substring(0, 200)}...`);
      return transcript;
    }

    console.log(`[DirectCaption] Transcript too short or empty`);
    return null;
  } catch (error) {
    console.error(`[DirectCaption] Error:`, error);
    return null;
  }
}

function parseTimedTextXml(xml: string): string {
  // Handle both XML formats (timedtext and transcript)
  const textMatches = xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
  const segments: string[] = [];

  for (const match of textMatches) {
    let text = match[1];
    // Decode HTML entities
    text = decodeHtmlEntities(text);
    if (text.trim()) {
      segments.push(text.trim());
    }
  }

  // If no <text> tags, try <s> tags (alternative format)
  if (segments.length === 0) {
    const sMatches = xml.matchAll(/<s[^>]*>([^<]*)<\/s>/g);
    for (const match of sMatches) {
      let text = match[1];
      text = decodeHtmlEntities(text);
      if (text.trim()) {
        segments.push(text.trim());
      }
    }
  }

  return segments.join(" ");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ");
}
