function updateDateTime() {
  const now = new Date();

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = days[now.getDay()];

  let hours = now.getHours();
  let minutes = now.getMinutes();
  if (minutes < 10) minutes = `0${minutes}`;

  const currentTime = `${day} ${hours}:${minutes}`;
  const paragraph = document.querySelector(".current-weather p");

  paragraph.innerHTML = `${currentTime}, sunny <br /> Humidity: <strong>64%</strong>, Wind: <strong>7.2km/h</strong>`;
}
updateDateTime();
setInterval(updateDateTime, 60000);

const apiKey = "ta8f14404a1b1cbdb0fo526029d3690d";

function fetchCityWeather(city) {
  const url = `https://api.shecodes.io/weather/v1/current?query=${encodeURIComponent(
    city
  )}&key=${apiKey}&units=metric`;

  return axios.get(url).then((res) => res.data);
}

const form = document.querySelector("form");
form.addEventListener("submit", function (event) {
  event.preventDefault();

  const input = document.querySelector('input[type="search"]');
  const query = input.value.trim();
  if (!query) return;

  const cityTitle = document.querySelector(".current-weather h1");
  cityTitle.textContent = query;

  fetchCityWeather(query)
    .then((data) => {
      cityTitle.textContent = data.city;

      const tempEl = document.querySelector(".temp");
      const current = Math.round(data.temperature.current);

      tempEl.textContent = `☀️ ${current}°C`;
    })
    .catch((err) => {
      console.error("Weather API error:", err);
      const tempEl = document.querySelector(".temp");
      tempEl.textContent = "N/A";
      cityTitle.textContent = "City not found";
    });
});
