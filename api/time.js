const gifCache = new Map();

async function getBackgroundGifDataUri(baseUrl) {
  if (gifCache.has(baseUrl)) {
    return gifCache.get(baseUrl);
  }

  const gifResponse = await fetch(`${baseUrl}/readme.gif`);
  if (!gifResponse.ok) {
    throw new Error(`Failed to load readme.gif (${gifResponse.status})`);
  }

  const gifArrayBuffer = await gifResponse.arrayBuffer();
  const gifBase64 = Buffer.from(gifArrayBuffer).toString("base64");
  const dataUri = `data:image/gif;base64,${gifBase64}`;
  gifCache.set(baseUrl, dataUri);
  return dataUri;
}

export default async function handler(req, res) {
  const now = new Date();
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  let backgroundGifDataUri;
  try {
    backgroundGifDataUri = await getBackgroundGifDataUri(baseUrl);
  } catch (error) {
    res.status(500).send("Unable to load background GIF.");
    return;
  }

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
    hour12: false
  });
  const [hours, minutes] = timeStr.split(':');

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.send(`
  <svg width="2048" height="1228" xmlns="http://www.w3.org/2000/svg">
    <style>
      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      .colon {
        animation: blink 1s step-start infinite;
      }
    </style>
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <image href="${backgroundGifDataUri}" width="2048" height="1228"/>

    <rect x="1095" y="285" width="172" height="65" fill="#0e0e0e"/>

    <text x="1179" y="342"
          font-size="52"
          fill="#ff3b3b"
          text-anchor="middle"
          font-family="monospace"
          font-weight="bold"
          letter-spacing="2"
          filter="url(#glow)">
      <tspan>${hours}</tspan><tspan class="colon">:</tspan><tspan>${minutes}</tspan>
    </text>

  </svg>
  `);
}