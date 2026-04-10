export default function handler(req, res) {
  const now = new Date();
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  const backgroundGifUrl = `${baseUrl}/readme.gif`;

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
    hour12: false
  });

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.send(`
  <svg width="2048" height="1228" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- GIF background -->
    <image href="${backgroundGifUrl}"
           width="2048" height="1228"/>

    <!-- Hide original clock area to prevent ghosting -->
    <rect x="950" y="170" width="250" height="120" fill="#1a1a1a"/>

    <!-- Dynamic clock text -->
    <text x="1075" y="250"
          font-size="90"
          fill="#ff3b3b"
          text-anchor="middle"
          font-family="monospace"
          letter-spacing="4"
          filter="url(#glow)">
      ${time}
    </text>

  </svg>
  `);
}