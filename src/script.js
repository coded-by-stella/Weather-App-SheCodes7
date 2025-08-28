// =================== Config ===================
const apiKey = "ta8f14404a1b1cbdb0fo526029d3690d"; // your SheCodes API key
const defaultCity = "Rome";

// =================== DOM Refs =================
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const cityEl = document.getElementById("city");
const timeEl = document.getElementById("time");
const descEl = document.getElementById("description");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const tempEl = document.getElementById("temperature");
const iconEl = document.getElementById("icon");
const helperEl = document.getElementById("helper");
const body = document.body;

// =================== Request Guard ============
// Ensures only the latest response updates the UI
let activeRequest = 0;

// =================== Utils ====================
function formatTime(date = new Date()) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const d = days[date.getDay()];
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${d} ${h}:${m}`;
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =================== Icon & Theme Logic =======
// Pure inline SVGs (no external CDN)
const SVGs = {
  Sun: (size = 96, stroke = 1.8) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
  </svg>`,
  Cloud: (size = 96, stroke = 1.8) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17.5 19a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.9 1"></path>
    <path d="M5 19h12.5"></path>
  </svg>`,
  CloudRain: (size = 96, stroke = 1.8) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17.5 18a4.5 4.5 0 0 0 0-9 5.5 5.5 0 0 0-10.9 1"></path>
    <path d="M5 18h12.5"></path>
    <path d="M8 20l-1 2M12 20l-1 2M16 20l-1 2"></path>
  </svg>`,
  Snowflake: (size = 96, stroke = 1.8) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"></path>
  </svg>`,
  Zap: (size = 96, stroke = 1.8) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"></path>
  </svg>`,
  Fog: (size = 96, stroke = 1.8) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 12h18M5 16h14M7 20h10"></path>
    <path d="M17.5 8a4.5 4.5 0 0 0-8.9 1"></path>
  </svg>`,
};

const iconRules = [
  { test: /(thunder|storm|lightning)/i, icon: "Zap", theme: "theme--storm" },
  { test: /(sleet|snow|blizzard|flurr)/i, icon: "Snowflake", theme: "theme--snow" },
  { test: /(rain|drizzle|shower)/i, icon: "CloudRain", theme: "theme--rain" },
  { test: /(fog|mist|haze|smoke)/i, icon: "Fog", theme: "theme--fog" },
  { test: /(overcast|cloud)/i, icon: "Cloud", theme: "theme--clouds" },
  { test: /(sunny|clear|bright)/i, icon: "Sun", theme: "theme--clear" },
];

function pickIconAndTheme(conditionIcon = "", description = "") {
  const src = `${conditionIcon} ${description}`.toLowerCase();
  // Map some common SheCodes icon tokens to our buckets
  // Examples to catch: "clear-sky-day", "few-clouds", "rain", "snow", "thunderstorm", "mist"
  if (/thunder/.test(src)) return { icon: "Zap", theme: "theme--storm" };
  if (/snow|sleet|blizzard|flurr/.test(src)) return { icon: "Snowflake", theme: "theme--snow" };
  if (/rain|drizzle|shower/.test(src)) return { icon: "CloudRain", theme: "theme--rain" };
  if (/mist|fog|haze|smoke/.test(src)) return { icon: "Fog", theme: "theme--fog" };
  if (/cloud/.test(src)) return { icon: "Cloud", theme: "theme--clouds" };
  if (/clear|sun/.test(src)) return { icon: "Sun", theme: "theme--clear" };
  // Fallback to regex rules on description
  const rule = iconRules.find((r) => r.test.test(description));
  return rule ? { icon: rule.icon, theme: rule.theme } : { icon: "Sun", theme: "theme--clear" };
}

function setInlineIcon(container, iconName, label = "") {
  const svgMaker = SVGs[iconName] || SVGs.Sun;
  container.innerHTML = svgMaker(96, 1.8);
  container.setAttribute("aria-label", label || iconName);
}

function applyTheme(themeClass) {
  body.className = themeClass;
}

// =================== API ======================
async function fetchCityWeather(city) {
  const url = `https://api.shecodes.io/weather/v1/current?query=${encodeURIComponent(
    city
  )}&key=${apiKey}&units=metric`;

  try {
    const res = await axios.get(url);
    if (!res?.data) throw new Error("Empty response");
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const apiMsg = err?.response?.data?.message;
    const msg = status
      ? `API error ${status}${apiMsg ? `: ${apiMsg}` : ""}`
      : err.message || "Network error";
    throw new Error(msg);
  }
}

// =================== Render ===================
function renderWeather(data) {
  if (
    !data ||
    !data.city ||
    !data.temperature ||
    typeof data.temperature.current !== "number"
  ) {
    throw new Error("Invalid data format");
  }

  const description = data?.condition?.description || "Clear";
  const conditionIcon = data?.condition?.icon || "";
  const tempCurrent = data.temperature.current;

  const humidityVal = Number.isFinite(data?.temperature?.humidity)
    ? data.temperature.humidity
    : Number.isFinite(data?.humidity)
      ? data.humidity
      : null;

  const windValue = data?.wind?.speed ?? data?.wind_speed;

  // Textual UI
  cityEl.textContent = data.city;
  tempEl.textContent = `${Math.round(tempCurrent)}°C`;
  humidityEl.textContent = humidityVal !== null ? `${Math.round(humidityVal)}%` : "—";
  windEl.textContent = Number.isFinite(windValue) ? `${Math.round(windValue)} km/h` : "—";
  descEl.textContent = capitalize(description);
  timeEl.textContent = formatTime(new Date());

  // Icon + Theme
  const { icon, theme } = pickIconAndTheme(conditionIcon, description);
  setInlineIcon(iconEl, icon, `Weather: ${capitalize(description)}`);
  applyTheme(theme);
}

// =================== Events ===================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  const rid = ++activeRequest;
  showMessage("Searching…", "info");

  // Interim UI
  cityEl.textContent = query;
  iconEl.innerHTML = "";
  tempEl.textContent = "—";
  descEl.textContent = "—";
  humidityEl.textContent = "—";
  windEl.textContent = "—";

  try {
    const data = await fetchCityWeather(query);
    if (rid !== activeRequest) return; // outdated response
    renderWeather(data);
    showMessage("");
  } catch (err) {
    if (rid !== activeRequest) return; // outdated error
    console.error("Weather API error:", err);
    showMessage(err.message || "City not found. Try another search.", "error");
    applyTheme("theme--fog");
  }
});

// =================== Time Ticker ==============
setInterval(() => {
  timeEl.textContent = formatTime(new Date());
}, 60_000);

// =================== Bootstrap ================
(async function init() {
  try {
    showMessage("Loading current weather…", "info");
    const data = await fetchCityWeather(defaultCity);
    renderWeather(data);
    showMessage("");
  } catch (err) {
    console.error("Init error:", err);
    showMessage(`Unable to load default city (${err.message}). Try searching.`, "error");
    // Fallback city to keep UI alive
    try {
      const backup = await fetchCityWeather("Oslo");
      renderWeather(backup);
      showMessage("");
    } catch {}
  }
})();
