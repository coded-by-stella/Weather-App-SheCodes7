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

// =================== Theme Helpers ============
function pickThemeKey(iconCode = "", description = "") {
  const src = `${iconCode} ${description}`.toLowerCase();
  if (/thunder|storm|lightning/.test(src)) return "storm";
  if (/snow|sleet|blizzard|flurr/.test(src)) return "snow";
  if (/rain|drizzle|shower/.test(src)) return "rain";
  if (/mist|fog|haze|smoke/.test(src)) return "fog";
  if (/cloud|overcast/.test(src)) return "clouds";
  if (/clear|sun/.test(src)) return "clear";
  return "clear";
}

function applyTheme(themeKey) {
  body.className = `theme--${themeKey}`;
}

function showMessage(msg, type = "info") {
  helperEl.textContent = msg || "";
  helperEl.dataset.type = type;
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
  const iconUrl     = data?.condition?.icon_url || "";
  const iconCode    = data?.condition?.icon || "";
  const tempCurrent = data.temperature.current;

  const humidityVal = Number.isFinite(data?.temperature?.humidity)
    ? data.temperature.humidity
    : Number.isFinite(data?.humidity)
      ? data.humidity
      : null;

  const windValue = data?.wind?.speed ?? data?.wind_speed;

  // Text UI
  cityEl.textContent = data.city;
  tempEl.textContent = `${Math.round(tempCurrent)}°C`;
  humidityEl.textContent = humidityVal !== null ? `${Math.round(humidityVal)}%` : "—";
  windEl.textContent = Number.isFinite(windValue) ? `${Math.round(windValue)} km/h` : "—";
  descEl.textContent = capitalize(description);
  timeEl.textContent = formatTime(new Date());

  // Icon UI (from SheCodes API)
  iconEl.src = iconUrl || "";
  iconEl.alt = `Weather: ${capitalize(description)}`;

  // Theme / background
  const themeKey = pickThemeKey(iconCode, description);
  applyTheme(themeKey);
}

// =================== Events ===================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  const rid = ++activeRequest;
  showMessage("Searching…", "info");

  // Interim UI reset
  cityEl.textContent = query;
  iconEl.src = "";
  iconEl.alt = "Weather icon";
  tempEl.textContent = "—";
  descEl.textContent = "—";
  humidityEl.textContent = "—";
  windEl.textContent = "—";

  try {
    const data = await fetchCityWeather(query);
    if (rid !== activeRequest) return; // ignore outdated response
    renderWeather(data);
    showMessage("");
  } catch (err) {
    if (rid !== activeRequest) return; // ignore outdated error
    console.error("Weather API error:", err);
    showMessage(err.message || "City not found. Try another search.", "error");
    applyTheme("fog");
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
    try {
      const backup = await fetchCityWeather("Oslo");
      renderWeather(backup);
      showMessage("");
    } catch {}
  }
})();
