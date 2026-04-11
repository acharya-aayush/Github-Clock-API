const gifCache = new Map();

const MINUTES_PER_DAY = 24 * 60;
const SECONDS_PER_DAY = 24 * 60 * 60;

const CLOCK_CENTER_X = 1179;
const CLOCK_BASELINE_Y = 342;
const CLOCK_LINE_STEP = 70;

const CLOCK_PANEL_X = 1095;
const CLOCK_PANEL_Y = 285;
const CLOCK_PANEL_WIDTH = 172;
const CLOCK_PANEL_HEIGHT = 65;

const DAY_MINUTE_LABELS = Array.from({ length: MINUTES_PER_DAY }, (_, minuteIndex) => {
  const hour = String(Math.floor(minuteIndex / 60)).padStart(2, "0");
  const minute = String(minuteIndex % 60).padStart(2, "0");
  return `${hour}:${minute}`;
});

function getQueryValue(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

function getSafeTimeZone(rawTz) {
  const requested = getQueryValue(rawTz).trim();
  const timeZone = requested || "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

function getTimeParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  const second = Number(parts.find((part) => part.type === "second")?.value || "0");

  return { hour, minute, second };
}

function buildMinuteTickerLines(startMinuteIndex) {
  const orderedLabels = Array.from({ length: MINUTES_PER_DAY }, (_, offset) => {
    return DAY_MINUTE_LABELS[(startMinuteIndex + offset) % MINUTES_PER_DAY];
  });

  return orderedLabels
    .map((label, index) => {
      const y = CLOCK_BASELINE_Y + index * CLOCK_LINE_STEP;
      return `<text x="${CLOCK_CENTER_X}" y="${y}">${label}</text>`;
    })
    .join("");
}

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
  const timeZone = getSafeTimeZone(req.query?.tz);
  const { hour, minute, second } = getTimeParts(now, timeZone);

  const startMinuteIndex = hour * 60 + minute;
  const minuteTickerLines = buildMinuteTickerLines(startMinuteIndex);

  let backgroundGifDataUri;
  try {
    backgroundGifDataUri = await getBackgroundGifDataUri(baseUrl);
  } catch (error) {
    res.status(500).send("Unable to load background GIF.");
    return;
  }

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.send(`
  <svg width="2048" height="1228" xmlns="http://www.w3.org/2000/svg">
    <style>
      @keyframes minuteTicker {
        from { transform: translateY(0px); }
        to { transform: translateY(-${CLOCK_LINE_STEP * MINUTES_PER_DAY}px); }
      }

      .minute-ticker {
        animation: minuteTicker ${SECONDS_PER_DAY}s steps(${MINUTES_PER_DAY}, end) infinite;
        animation-delay: -${second}s;
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

      <clipPath id="clockClip">
        <rect x="${CLOCK_PANEL_X}" y="${CLOCK_PANEL_Y}" width="${CLOCK_PANEL_WIDTH}" height="${CLOCK_PANEL_HEIGHT}"/>
      </clipPath>
    </defs>

    <image href="${backgroundGifDataUri}" width="2048" height="1228"/>

    <rect x="${CLOCK_PANEL_X}" y="${CLOCK_PANEL_Y}" width="${CLOCK_PANEL_WIDTH}" height="${CLOCK_PANEL_HEIGHT}" fill="#0e0e0e"/>

    <g clip-path="url(#clockClip)"
       class="minute-ticker"
       font-size="52"
       fill="#ff3b3b"
       text-anchor="middle"
       font-family="monospace"
       font-weight="bold"
       letter-spacing="2"
       filter="url(#glow)">
      ${minuteTickerLines}
    </g>

  </svg>
  `);
}