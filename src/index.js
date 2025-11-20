
let currentUnit = 'celsius';
let currentWindUnit = 'kmh';
let currentPrecipUnit = 'mm';
let weatherData = null;
let searchTimeout = null;
let selectedDayIndex = 0;
let currentCityInfo = null;

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const unitsBtn = document.getElementById('unitsBtn');
const unitsDropdown = document.getElementById('unitsDropdown');
const hoursBtn = document.getElementById('hoursBtn');
const hoursDropdown = document.getElementById('hoursDropdown');
const searchSuggestions = document.getElementById('searchSuggestions');
const searchProgress = document.getElementById('searchProgress');
const errorState = document.getElementById('errorState');
const mainContent = document.getElementById('mainContent');
const loadingState = document.getElementById('loadingState');
const weatherCard = document.getElementById('weatherCard');
const retryBtn = document.getElementById('retryBtn');


const tempCelsius = document.getElementById('tempCelsius');
const tempFahrenheit = document.getElementById('tempFahrenheit');
const windKmh = document.getElementById('windKmh');
const windMph = document.getElementById('windMph');
const precipMm = document.getElementById('precipMm');
const precipIn = document.getElementById('precipIn');


function showError() {
  mainContent.classList.add('hidden');
  errorState.classList.remove('hidden');
}

function hideError() {
  errorState.classList.add('hidden');
  mainContent.classList.remove('hidden');
}

function showLoading() {
  weatherCard.classList.add('hidden');
  loadingState.classList.remove('hidden');
}

function hideLoading() {
  loadingState.classList.add('hidden');
  weatherCard.classList.remove('hidden');
}

// Get city coordinates
async function getCityCoordinates(cityName) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return {
        lat: data.results[0].latitude,
        lon: data.results[0].longitude,
        name: data.results[0].name,
        country: data.results[0].country
      };
    } else {
      throw new Error('City not found');
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}


async function getCitySuggestions(query) {
  if (query.length < 2) return [];
  
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results.map(city => ({
        name: city.name,
        country: city.country,
        lat: city.latitude,
        lon: city.longitude
      }));
    }
    return [];
  } catch (error) {
    console.error('Suggestion error:', error);
    return [];
  }
}


function showSuggestions(suggestions) {
  if (suggestions.length === 0) {
    searchSuggestions.classList.add('hidden');
    return;
  }
  
  searchSuggestions.innerHTML = suggestions.map(city => `
    <div class="suggestion-item px-4 py-3 hover:bg-white/10 cursor-pointer transition border-b border-white/10 last:border-b-0" 
         data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}" data-country="${city.country}">
      <div class="font-medium">${city.name}</div>
      <div class="text-sm text-gray-400">${city.country}</div>
    </div>
  `).join('');
  
  searchSuggestions.classList.remove('hidden');
  
  document.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', async () => {
      const cityInfo = {
        name: item.dataset.name,
        country: item.dataset.country,
        lat: parseFloat(item.dataset.lat),
        lon: parseFloat(item.dataset.lon)
      };
      
      cityInput.value = `${cityInfo.name}, ${cityInfo.country}`;
      searchSuggestions.classList.add('hidden');
      
      await fetchAndDisplayWeather(cityInfo);
    });
  });
}


async function getWeatherData(lat, lon) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
  );
  
  if (!response.ok) {
    throw new Error('Weather API failed');
  }
  
  const data = await response.json();
  return data;
}


function getWeatherIcon(code) {
  const icons = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '🌨️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };
  return icons[code] || '☀️';
}


function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}


function getDayName(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}


function convertTemp(temp, toUnit) {
  if (toUnit === 'fahrenheit') {
    return Math.round((temp * 9/5) + 32);
  }
  return Math.round(temp);
}


function convertWind(speed, toUnit) {
  if (toUnit === 'mph') {
    return Math.round(speed * 0.621371);
  }
  return Math.round(speed);
}


function convertPrecip(amount, toUnit) {
  if (toUnit === 'in') {
    return (amount * 0.0393701).toFixed(2);
  }
  return amount.toFixed(1);
}


function updateUI(data, cityInfo) {
  weatherData = data;
  currentCityInfo = cityInfo;
  
  const tempSymbol = currentUnit === 'celsius' ? '°C' : '°F';
  const windUnit = currentWindUnit === 'kmh' ? 'km/h' : 'mph';
  const precipUnit = currentPrecipUnit === 'mm' ? 'mm' : 'in';
  
  
  document.getElementById('cityName').textContent = `${cityInfo.name}, ${cityInfo.country}`;
  document.getElementById('currentDate').textContent = formatDate(data.current.time);
  document.getElementById('mainTemp').textContent = `${convertTemp(data.current.temperature_2m, currentUnit)}${tempSymbol}`;
  
  
  document.getElementById('feelsLike').textContent = `${convertTemp(data.current.apparent_temperature, currentUnit)}${tempSymbol}`;
  document.getElementById('humidity').textContent = `${data.current.relative_humidity_2m}%`;
  document.getElementById('wind').textContent = `${convertWind(data.current.wind_speed_10m, currentWindUnit)} ${windUnit}`;
  document.getElementById('precipitation').textContent = `${convertPrecip(data.current.precipitation, currentPrecipUnit)} ${precipUnit}`;
  
  
  const dailyHTML = data.daily.time.slice(0, 7).map((date, i) => {
    const maxTemp = convertTemp(data.daily.temperature_2m_max[i], currentUnit);
    const minTemp = convertTemp(data.daily.temperature_2m_min[i], currentUnit);
    const icon = getWeatherIcon(data.daily.weather_code[i]);
    
    return `
      <div class="bg-[#2F2F49] rounded-lg p-4 text-center">
        <h2 class="font-semibold mb-2">${getDayName(date)}</h2>
        <div class="text-4xl mb-2">${icon}</div>
        <div class="font-light flex justify-between text-[18px]">
          <span>${maxTemp}°</span>
          <span class="text-gray-400">${minTemp}°</span>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('dailyForecast').innerHTML = dailyHTML;
  
  
  updateHourlyForecast(data, selectedDayIndex);
  updateDaySelector(data);
}


function updateHourlyForecast(data, dayIndex) {
  const startHour = dayIndex * 24;
  const tempSymbol = currentUnit === 'celsius' ? '°C' : '°F';
  
  const hourlyHTML = Array.from({length: 8}, (_, i) => {
    const hourIndex = startHour + i * 3;
    if (hourIndex >= data.hourly.time.length) return '';
    
    const time = new Date(data.hourly.time[hourIndex]);
    const hour = time.getHours();
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const temp = convertTemp(data.hourly.temperature_2m[hourIndex], currentUnit);
    const icon = getWeatherIcon(data.hourly.weather_code[hourIndex]);
    
    return `
      <div class="flex justify-between items-center bg-[#2F2F49] rounded-md px-3 py-2 gap-3">
        <div class="flex items-center gap-2">
          <span class="text-3xl">${icon}</span>
          <p class="font-medium">${displayHour} ${period}</p>
        </div>
        <div class="font-semibold">${temp}${tempSymbol}</div>
      </div>
    `;
  }).join('');
  
  document.getElementById('hourlyForecast').innerHTML = hourlyHTML;
}


function updateDaySelector(data) {
  const days = data.daily.time.slice(0, 7).map((date, i) => {
    const fullDayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    return { full: fullDayName, index: i };
  });
  
  const dropdownHTML = days.map(day => `
    <div class="day-option px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition ${day.index === selectedDayIndex ? 'bg-white/10 text-blue-400' : ''}" 
         data-index="${day.index}">
      <div class="text-sm">${day.full}</div>
    </div>
  `).join('');
  
  hoursDropdown.innerHTML = dropdownHTML;
  
  const selectedDay = days[selectedDayIndex];
  document.getElementById('selectedDay').textContent = `${selectedDay.full} ▾`;
  
  document.querySelectorAll('.day-option').forEach(option => {
    option.addEventListener('click', () => {
      selectedDayIndex = parseInt(option.dataset.index);
      updateHourlyForecast(weatherData, selectedDayIndex);
      updateDaySelector(weatherData);
      hoursDropdown.classList.add('hidden');
    });
  });
}

// Fetch and display weather
async function fetchAndDisplayWeather(cityInfo) {
  try {
    searchBtn.textContent = 'Searching...';
    searchBtn.disabled = true;
    searchProgress.classList.remove('hidden');
    
    showLoading();
    hideError();
    
    const weather = await getWeatherData(cityInfo.lat, cityInfo.lon);
    updateUI(weather, cityInfo);
    
    hideLoading();
    searchProgress.classList.add('hidden');
  } catch (error) {
    console.error('Error fetching weather:', error);
    showError();
    searchProgress.classList.add('hidden');
  } finally {
    searchBtn.textContent = 'Search';
    searchBtn.disabled = false;
  }
}

// Search weather
async function searchWeather() {
  const cityName = cityInput.value.trim();
  if (!cityName) {
    alert('Please enter a city name');
    return;
  }
  
  try {
    const cityInfo = await getCityCoordinates(cityName);
    await fetchAndDisplayWeather(cityInfo);
  } catch (error) {
    showError();
  }
}

// Event listeners
searchBtn.addEventListener('click', searchWeather);

cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchWeather();
    searchSuggestions.classList.add('hidden');
  }
});

cityInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  
  if (query.length < 2) {
    searchSuggestions.classList.add('hidden');
    return;
  }
  
  searchTimeout = setTimeout(async () => {
    const suggestions = await getCitySuggestions(query);
    showSuggestions(suggestions);
  }, 500);
});

cityInput.addEventListener('blur', () => {
  setTimeout(() => {
    searchSuggestions.classList.add('hidden');
  }, 200);
});

// Units dropdown toggle
unitsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  unitsDropdown.classList.toggle('hidden');
  hoursDropdown.classList.add('hidden');
});

hoursBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  hoursDropdown.classList.toggle('hidden');
  unitsDropdown.classList.add('hidden');
});

document.addEventListener('click', (e) => {
  if (!unitsDropdown.contains(e.target) && !unitsBtn.contains(e.target)) {
    unitsDropdown.classList.add('hidden');
  }
  if (!hoursDropdown.contains(e.target) && !hoursBtn.contains(e.target)) {
    hoursDropdown.classList.add('hidden');
  }
});

// Temperature unit handlers
tempCelsius.addEventListener('click', () => {
  currentUnit = 'celsius';
  tempCelsius.querySelector('span:last-child').classList.remove('opacity-0');
  tempFahrenheit.querySelector('span:last-child').classList.add('opacity-0');
  if (weatherData && currentCityInfo) {
    updateUI(weatherData, currentCityInfo);
  }
});

tempFahrenheit.addEventListener('click', () => {
  currentUnit = 'fahrenheit';
  tempFahrenheit.querySelector('span:last-child').classList.remove('opacity-0');
  tempCelsius.querySelector('span:last-child').classList.add('opacity-0');
  if (weatherData && currentCityInfo) {
    updateUI(weatherData, currentCityInfo);
  }
});

// Wind unit handlers
windKmh.addEventListener('click', () => {
  currentWindUnit = 'kmh';
  windKmh.querySelector('span:last-child').classList.remove('opacity-0');
  windMph.querySelector('span:last-child').classList.add('opacity-0');
  if (weatherData && currentCityInfo) {
    updateUI(weatherData, currentCityInfo);
  }
});

windMph.addEventListener('click', () => {
  currentWindUnit = 'mph';
  windMph.querySelector('span:last-child').classList.remove('opacity-0');
  windKmh.querySelector('span:last-child').classList.add('opacity-0');
  if (weatherData && currentCityInfo) {
    updateUI(weatherData, currentCityInfo);
  }
});

// Precipitation unit handlers
precipMm.addEventListener('click', () => {
  currentPrecipUnit = 'mm';
  precipMm.querySelector('span:last-child').classList.remove('opacity-0');
  precipIn.querySelector('span:last-child').classList.add('opacity-0');
  if (weatherData && currentCityInfo) {
    updateUI(weatherData, currentCityInfo);
  }
});

precipIn.addEventListener('click', () => {
  currentPrecipUnit = 'in';
  precipIn.querySelector('span:last-child').classList.remove('opacity-0');
  precipMm.querySelector('span:last-child').classList.add('opacity-0');
  if (weatherData && currentCityInfo) {
    updateUI(weatherData, currentCityInfo);
  }
});

// Retry button
retryBtn.addEventListener('click', () => {
  hideError();
  if (currentCityInfo) {
    fetchAndDisplayWeather(currentCityInfo);
  } else {
    cityInput.value = 'Berlin';
    searchWeather();
  }
});

// Load default city on page load
window.addEventListener('DOMContentLoaded', async () => {
  cityInput.value = 'Berlin';
  await searchWeather();
});