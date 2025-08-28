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

function classifyTheme(description = "") {
  const t = description.toLowerCase();
  if (/(thunder|storm|lightning)/.test(t)) return "theme--storm";
  if (/(snow|sleet|blizzard|flurr)/.test(t)) return "theme--snow";
  if (/(rain|drizzle|shower)/.test(t)) return "theme--rain";
  if (/(fog|mist|haze|smoke)/.test(t)) return "theme--fog";
  if (/(cloud|overcast)/.test(t)) return "theme--clouds";
  return "theme--clear";
}

function setThemeFromDescription(description) {
  body.className = classifyTheme(description);
}

function showMessage(msg, type = "info") {
  helperEl.textContent = msg || "";
  helperEl.dataset.type = type;
}

// =================== Icons (Lucide) ===========
// Uses lucide.icons[name].toSvg(...) for reliability
const lucideMap = [
  { test: /(thunder|storm|lightning)/i, icon: "Zap" },
  { test: /(sleet|snow|blizzard|flurr)/i, icon: "Snowflake" },
  { test: /(rain|drizzle|shower)/i, icon: "CloudRain" },
  { test: /(fog|mist|haze|smoke)/i, icon: "Fog" },
  { test: /(overcast|cloud)/i, icon: "Cloud" },
  { test: /(sunny|clear|bright)/i, icon: "Sun" },
];

function pickLucideIcon(description = "") {
  const match = lucideMap.find((m) => m.test.test(description));
  return match ? match.icon : "Sun"; // <- fixed line
}

function setLucideIcon(container, iconName, label = "") {
  const lib = window.lucide && window.lucide.icons;
  if (!lib || !lib[iconName] || typeof lib[iconName].toSvg !== "function") {
    container.textContent = "☀️";
    container.setAttribute("aria-label", label || "Weather");
    return;
  }
  const svg = lib[iconName].toSvg({ width: 96, height: 96, strokeWidth: 1.8 });
  container.innerHTML = svg;
  container.setAttribute("aria-label", label || iconName);
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
  const tempCurrent = data.temperature.current;

  const humidityVal = Number.isFinite(data?.temperature?.humidity)
    ? data.temperature.humidity
    : Number.isFinite(data?.humidity)
      ? data.humidity
      : null;

  const windValue = data?.wind?.speed ?? data?.wind_speed;

  cityEl.textContent = data.city;
  tempEl.textContent = `${Math.round(tempCurrent)}°C`;
  humidityEl.textContent = humidityVal !== null ? `${Math.round(humidityVal)}%` : "—";
  windEl.textContent = Number.isFinite(windValue) ? `${Math.round(windValue)} km/h` : "—";
  descEl.textContent = capitalize(description);

    // Weather icon (from SheCodes API)
  const iconUrl = data?.condition?.icon_url || "";
  if (iconUrl) {
    iconEl.src = iconUrl;
    iconEl.alt = `Weather: ${capitalize(description)}`;
  }

  // Background theme (still dynamic)
  const themeKey = pickThemeKey(data.condition.icon, description);
  applyTheme(themeKey);

  timeEl.textContent = formatTime(new Date());

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
    body.className = "theme--fog";
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
    // Silent fallback so UI shows something
    try {
      const backup = await fetchCityWeather("Oslo");
      renderWeather(backup);
      showMessage("");
    } catch {}
  }
})();
