// =================== Config ===================
const apiKey = "ta8f14404a1b1cbdb0fo526029d3690d"; // tua API key SheCodes
const defaultCity = "Rome";

// =================== DOM refs =================
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

// =================== Icons (Lucide) ===================
const lucideMap = [
  { test: /(thunder|storm|lightning)/, icon: "Zap" },
  { test: /(sleet|snow|blizzard|flurr)/, icon: "Snowflake" },
  { test: /(rain|drizzle|shower)/, icon: "CloudRain" },
  { test: /(fog|mist|haze|smoke)/, icon: "Fog" },
  { test: /(overcast|cloud)/, icon: "Cloud" },
  { test: /(sunny|clear|bright)/, icon: "Sun" },
];

function pickLucideIcon(description = "") {
  const txt = String(description).toLowerCase();
  const match = lucideMap.find((m) => m.test.test(txt));
  return match ? match.icon : "Sun";
}

function setLucideIcon(container, iconName, label = "") {
  if (!window.lucide || !window.lucide.icons || !window.lucide.icons[iconName]) {
    container.textContent = "☀️";
    container.setAttribute("aria-label", label || "Weather");
    return;
  }
  const svg = window.lucide.icons[iconName].toSvg({
    width: "96",
    height: "96",
    strokeWidth: 1.8,
  });
  container.innerHTML = svg;
  container.setAttribute("aria-label", label || iconName);
}

// =================== API ======================
async function fetchCityWeather(city) {
  const url = `https://api.shecodes.io/weather/v1/current?query=${encodeURIComponent(
    city
  )}&key=${apiKey}&units=metric`;
  const { data } = await axios.get(url);
  return data;
}

// =================== Render ===================
function renderWeather(data) {
  const description = data?.condition?.description || "—";
  const tempCurrent = data?.temperature?.current;
  const humidityFromTemp = data?.temperature?.humidity;
  const humidityRoot = data?.humidity;

  cityEl.textContent = data?.city || input.value.trim();
  tempEl.textContent = Number.isFinite(tempCurrent) ? `${Math.round(tempCurrent)}°C` : "—";

  // humidity: SheCodes spesso fornisce temperature.humidity, fallback a root
  const humidityVal = Number.isFinite(humidityFromTemp)
    ? humidityFromTemp
    : Number.isFinite(humidityRoot) ? humidityRoot : null;
  humidityEl.textContent = humidityVal !== null ? `${Math.round(humidityVal)}%` : "—";

  // wind in km/h
  const windValue = data?.wind?.speed ?? data?.wind_speed;
  windEl.textContent = Number.isFinite(windValue) ? `${Math.round(windValue)} km/h` : "—";

  descEl.textContent = capitalize(description);

  // Icona Lucide
  const iconName = pickLucideIcon(description);
  setLucideIcon(iconEl, iconName, `Weather: ${capitalize(description)}`);

  // Orario locale dispositivo
  timeEl.textContent = formatTime(new Date());

  // Tema dinamico
  setThemeFromDescription(description);
}

// =================== Events ===================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  showMessage("Searching…", "info");

  // reset placeholder UI
  cityEl.textContent = query;
  iconEl.innerHTML = "";
  tempEl.textContent = "—";
  descEl.textContent = "—";
  humidityEl.textContent = "—";
  windEl.textContent = "—";

  try {
    const data = await fetchCityWeather(query);
    renderWeather(data);
    showMessage("");
  } catch (err) {
    console.error("Weather API error:", err);
    showMessage("City not found. Try another search.", "error");
    body.className = "theme--fog"; // fallback
  }
});

// orologio UI ogni minuto
setInterval(() => {
  timeEl.textContent = formatTime(new Date());
}, 60_000);

// bootstrap
(async function init() {
  try {
    showMessage("Loading current weather…", "info");
    const data = await fetchCityWeather(defaultCity);
    renderWeather(data);
    showMessage("");
  } catch (err) {
    console.error(err);
    showMessage("Unable to load default city. Try searching.", "error");
  }
})();
