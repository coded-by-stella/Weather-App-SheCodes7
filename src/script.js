const apiKey = "ta8f14404a1b1cbdb0fo526029d3690d";
const defaultCity = "Rome";


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


function formatTime(date = new Date()) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const d = days[date.getDay()];
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${d} ${h}:${m}`;
}

function classifyTheme(description) {
 
  const text = (description || "").toLowerCase();
  if (/(thunder|storm)/.test(text)) return "theme--storm";
  if (/(snow|sleet|blizzard)/.test(text)) return "theme--snow";
  if (/(rain|drizzle|shower)/.test(text)) return "theme--rain";
  if (/(fog|mist|haze|smoke)/.test(text)) return "theme--fog";
  if (/(cloud)/.test(text)) return "theme--clouds";
 
  return "theme--clear";
}

function setThemeFromDescription(description) {
  const theme = classifyTheme(description);
  body.className = theme; 
}

function showMessage(msg, type = "info") {
  helperEl.textContent = msg || "";
  helperEl.dataset.type = type;
}


async function fetchCityWeather(city) {
  const url = `https://api.shecodes.io/weather/v1/current?query=${encodeURIComponent(
    city
  )}&key=${apiKey}&units=metric`;
  const { data } = await axios.get(url);
  return data;
}


function renderWeather(data) {
  cityEl.textContent = data.city || input.value.trim();
  tempEl.textContent = `${Math.round(data.temperature.current)}°C`;
  humidityEl.textContent = `${Math.round(data.temperature.humidity ?? data.humidity)}%`;

 
  const windValue = data.wind?.speed ?? data.wind_speed;
  if (typeof windValue === "number") {
    windEl.textContent = `${Math.round(windValue)} km/h`;
  } else {
    windEl.textContent = "—";
  }

  const description = data.condition?.description || "—";
  descEl.textContent = capitalize(description);

  const iconUrl = data.condition?.icon_url;
  if (iconUrl) {
    iconEl.src = iconUrl;
    iconEl.alt = description;
    iconEl.style.display = "block";
  } else {
    iconEl.style.display = "none";
  }

  
  timeEl.textContent = formatTime(new Date());

  
  setThemeFromDescription(description);
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  showMessage("Searching…", "info");
  cityEl.textContent = query;
  iconEl.style.display = "none";
  tempEl.textContent = "—";
  descEl.textContent = "—";
  humidityEl.textContent = "—";
  windEl.textContent = "—";

  try {
    const data = await fetchCityWeather(query);
    renderWeather(data);
    showMessage(""); 
  } catch (err) {
    console.error(err);
    showMessage("City not found. Try another search.", "error");
    body.className = "theme--fog"; 
  }
});


setInterval(() => (timeEl.textContent = formatTime(new Date())), 60_000);


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
