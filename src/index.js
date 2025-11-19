let currentUnit = 'celsius';
let currentWindUnit = 'kmh';
let currentPrecipUnit = 'mm';
let weatherData = null;
let searchTimeout = null;
let selectedDayIndex = 0;

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.querySelector('.input button');
const unitsBtn = document.getElementById('unitsBtn');
const unitsDropdown = document.getElementById('unitsDropdown');
const hoursBtn = document.getElementById('hoursBtn');
const hoursDropdown = document.getElementById('hoursDropdown');
const searchSuggestions = document.getElementById('searchSuggestions');
const searchLoading = document.getElementById('searchLoading');

const tempCelsius = document.getElementById('tempCelsius');
const tempFahrenheit = document.getElementById('tempFahrenheit');
const windKmh = document.getElementById('windKmh');
const windMph = document.getElementById('windMph');
const precipMm = document.getElementById('precipMm');
const precipIn = document.getElementById('precipIn');

// Geocoding API - Get city coordinates
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
        alert('City not found. Please try another city.');
        return null;
    }
}

// Get city suggestions for autocomplete
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

// Show search suggestions
function showSuggestions(suggestions) {
    if (suggestions.length === 0) {
        searchSuggestions.classList.add('hidden');
        return;
    }
    
    searchSuggestions.innerHTML = suggestions.map(city => `
        <div class="suggestion-item px-4 py-3 hover:bg-white/10 cursor-pointer transition border-b border-white/10 last:border-b-0" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}" data-country="${city.country}">
            <div class="font-medium">${city.name}</div>
            <div class="text-sm text-gray-400">${city.country}</div>
        </div>
    `).join('');
    
    searchSuggestions.classList.remove('hidden');
    searchLoading.classList.add('hidden');
    
    // Add click handlers to suggestions
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
            
            // Fetch and display weather
            searchBtn.textContent = 'Searching...';
            searchBtn.disabled = true;
            
            const weather = await getWeatherData(cityInfo.lat, cityInfo.lon);
            if (weather) {
                updateUI(weather, cityInfo);
            }
            
            searchBtn.textContent = 'Search';
            searchBtn.disabled = false;
        });
    });
}

// Weather API - Fetch weather data
async function getWeatherData(lat, lon) {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Weather API error:', error);
        alert('Failed to fetch weather data. Please try again.');
        return null;
    }
}

// Get weather icon based on WMO code
function getWeatherIcon(code) {
    const weatherIcons = {
        0: { icon: 'icon-sunny.webp', desc: 'Clear sky' },
        1: { icon: 'icon-sunny.webp', desc: 'Mainly clear' },
        2: { icon: 'icon-partly-cloudy.webp', desc: 'Partly cloudy' },
        3: { icon: 'icon-overcast.webp', desc: 'Overcast' },
        45: { icon: 'icon-fog.webp', desc: 'Foggy' },
        48: { icon: 'icon-fog.webp', desc: 'Foggy' },
        51: { icon: 'icon-drizzle.webp', desc: 'Light drizzle' },
        53: { icon: 'icon-drizzle.webp', desc: 'Moderate drizzle' },
        55: { icon: 'icon-drizzle.webp', desc: 'Dense drizzle' },
        61: { icon: 'icon-rain.webp', desc: 'Slight rain' },
        63: { icon: 'icon-rain.webp', desc: 'Moderate rain' },
        65: { icon: 'icon-rain.webp', desc: 'Heavy rain' },
        71: { icon: 'icon-rain.webp', desc: 'Slight snow' },
        73: { icon: 'icon-rain.webp', desc: 'Moderate snow' },
        75: { icon: 'icon-rain.webp', desc: 'Heavy snow' },
        95: { icon: 'icon-storm.webp', desc: 'Thunderstorm' },
        96: { icon: 'icon-storm.webp', desc: 'Thunderstorm with hail' },
        99: { icon: 'icon-storm.webp', desc: 'Thunderstorm with heavy hail' }
    };
    return weatherIcons[code] || { icon: 'icon-sunny.webp', desc: 'Clear' };
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Get day name
function getDayName(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Unit conversions
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

// Update UI with weather data
function updateUI(data, cityInfo) {
    weatherData = data;
    
    // Update location and date
    document.querySelector('.weather-card h2').textContent = `${cityInfo.name}, ${cityInfo.country}`;
    document.querySelector('.weather-card p').textContent = formatDate(data.current.time);
    
    // Update main temperature
    const mainTemp = convertTemp(data.current.temperature_2m, currentUnit);
    const tempSymbol = currentUnit === 'celsius' ? '°C' : '°F';
    document.querySelector('.weather-card h1').textContent = `${mainTemp}${tempSymbol}`;
    
    // Update weather icon
    const currentWeatherIcon = getWeatherIcon(data.current.weather_code);
    document.querySelector('.weather-card img').src = currentWeatherIcon.icon;
    document.querySelector('.weather-card img').alt = currentWeatherIcon.desc;
    
    // Update weather details
    const feelsLike = convertTemp(data.current.apparent_temperature, currentUnit);
    const windSpeed = convertWind(data.current.wind_speed_10m, currentWindUnit);
    const windUnit = currentWindUnit === 'kmh' ? 'km/h' : 'mph';
    const precip = convertPrecip(data.current.precipitation, currentPrecipUnit);
    const precipUnit = currentPrecipUnit === 'mm' ? 'mm' : 'in';
    
    document.querySelector('.weather-details > div:nth-child(1) h1').textContent = `${feelsLike}${tempSymbol}`;
    document.querySelector('.weather-details > div:nth-child(2) h1').textContent = `${data.current.relative_humidity_2m}%`;
    document.querySelector('.weather-details > div:nth-child(3) h1').textContent = `${windSpeed} ${windUnit}`;
    document.querySelector('.weather-details > div:nth-child(4) h1').textContent = `${precip} ${precipUnit}`;
    
    // Update daily forecast
    const forecastCards = document.querySelectorAll('.forecast-details > div');
    for (let i = 0; i < Math.min(7, forecastCards.length); i++) {
        const dayData = {
            date: data.daily.time[i],
            maxTemp: data.daily.temperature_2m_max[i],
            minTemp: data.daily.temperature_2m_min[i],
            weatherCode: data.daily.weather_code[i]
        };
        
        const card = forecastCards[i];
        const dayName = getDayName(dayData.date);
        const maxTemp = convertTemp(dayData.maxTemp, currentUnit);
        const minTemp = convertTemp(dayData.minTemp, currentUnit);
        const weatherIcon = getWeatherIcon(dayData.weatherCode);
        
        card.querySelector('h2').textContent = dayName;
        card.querySelector('img').src = weatherIcon.icon;
        card.querySelector('img').alt = weatherIcon.desc;
        card.querySelector('.font-light span:nth-child(1)').textContent = `${maxTemp}${tempSymbol}`;
        card.querySelector('.font-light span:nth-child(2)').textContent = `${minTemp}${tempSymbol}`;
    }
    
    // Update hourly forecast for selected day
    updateHourlyForecast(data, selectedDayIndex);
    
    // Update day selector dropdown
    updateDaySelector(data);
}

// Update hourly forecast
function updateHourlyForecast(data, dayIndex = 0) {
    const hourlyCards = document.querySelectorAll('.hourly-grid > div');
    const startHour = dayIndex * 24; // Each day has 24 hours
    const tempSymbol = currentUnit === 'celsius' ? '°C' : '°F';
    
    for (let i = 0; i < Math.min(8, hourlyCards.length); i++) {
        const hourIndex = startHour + i;
        if (hourIndex < data.hourly.time.length) {
            const hourData = {
                time: data.hourly.time[hourIndex],
                temp: data.hourly.temperature_2m[hourIndex],
                weatherCode: data.hourly.weather_code[hourIndex]
            };
            
            const card = hourlyCards[i];
            const hour = new Date(hourData.time).getHours();
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            const temp = convertTemp(hourData.temp, currentUnit);
            const weatherIcon = getWeatherIcon(hourData.weatherCode);
            
            card.querySelector('p').textContent = `${displayHour} ${period}`;
            card.querySelector('img').src = weatherIcon.icon;
            card.querySelector('img').alt = weatherIcon.desc;
            card.querySelector('div:last-child').textContent = `${temp}°${currentUnit === 'celsius' ? 'C' : 'F'}`;
        }
    }
}

// Update day selector dropdown
function updateDaySelector(data) {
    const days = [];
    for (let i = 0; i < Math.min(7, data.daily.time.length); i++) {
        const dayName = getDayName(data.daily.time[i]);
        const fullDayName = new Date(data.daily.time[i]).toLocaleDateString('en-US', { weekday: 'long' });
        days.push({ short: dayName, full: fullDayName, index: i });
    }
    
    hoursDropdown.innerHTML = days.map(day => `
        <div class="day-option mb-1 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition ${day.index === selectedDayIndex ? 'bg-white/10 text-blue-400' : ''}" data-index="${day.index}">
            <div class="text-sm">${day.full}</div>
        </div>
    `).join('');
    
    // Update button text
    const selectedDay = days.find(d => d.index === selectedDayIndex);
    hoursBtn.querySelector('span').textContent = `${selectedDay.full} ▾`;
    
    // Add click handlers
    document.querySelectorAll('.day-option').forEach(option => {
        option.addEventListener('click', () => {
            selectedDayIndex = parseInt(option.dataset.index);
            updateHourlyForecast(weatherData, selectedDayIndex);
            updateDaySelector(weatherData);
            hoursDropdown.classList.add('hidden');
        });
    });
}

// Search weather function
async function searchWeather() {
    const cityName = cityInput.value.trim();
    if (!cityName) {
        alert('Please enter a city name');
        return;
    }
    
    // Show loading state
    searchBtn.textContent = 'Searching...';
    searchBtn.disabled = true;
    
    // Get coordinates
    const cityInfo = await getCityCoordinates(cityName);
    if (!cityInfo) {
        searchBtn.textContent = 'Search';
        searchBtn.disabled = false;
        return;
    }
    
    // Get weather data
    const weather = await getWeatherData(cityInfo.lat, cityInfo.lon);
    if (!weather) {
        searchBtn.textContent = 'Search';
        searchBtn.disabled = false;
        return;
    }
    
    // Update UI
    updateUI(weather, cityInfo);
    
    // Reset button
    searchBtn.textContent = 'Search';
    searchBtn.disabled = false;
}

// Event Listeners - Search
searchBtn.addEventListener('click', searchWeather);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchWeather();
        searchSuggestions.classList.add('hidden');
    }
});

// Search input suggestions
cityInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        searchSuggestions.classList.add('hidden');
        searchLoading.classList.add('hidden');
        return;
    }
    
    // Show loading indicator
    searchLoading.classList.remove('hidden');
    searchSuggestions.classList.add('hidden');
    
    searchTimeout = setTimeout(async () => {
        const suggestions = await getCitySuggestions(query);
        searchLoading.classList.add('hidden');
        showSuggestions(suggestions);
    }, 500);
});

// Close suggestions when clicking outside
cityInput.addEventListener('blur', () => {
    setTimeout(() => {
        searchSuggestions.classList.add('hidden');
        searchLoading.classList.add('hidden');
    }, 200);
});

// Event Listeners - Units Dropdown
unitsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    unitsDropdown.classList.toggle('hidden');
    hoursDropdown.classList.add('hidden'); // Close other dropdown
});

// Event Listeners - Hours Dropdown
hoursBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hoursDropdown.classList.toggle('hidden');
    unitsDropdown.classList.add('hidden'); // Close other dropdown
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!unitsDropdown.contains(e.target) && e.target !== unitsBtn && !unitsBtn.contains(e.target)) {
        unitsDropdown.classList.add('hidden');
    }
    if (!hoursDropdown.contains(e.target) && e.target !== hoursBtn && !hoursBtn.contains(e.target)) {
        hoursDropdown.classList.add('hidden');
    }
});

// Temperature unit conversion
tempCelsius.addEventListener('click', () => {
    currentUnit = 'celsius';
    tempCelsius.querySelector('span:last-child').classList.remove('opacity-0');
    tempFahrenheit.querySelector('span:last-child').classList.add('opacity-0');
    if (weatherData) {
        const cityInfo = {
            name: document.querySelector('.weather-card h2').textContent.split(',')[0],
            country: document.querySelector('.weather-card h2').textContent.split(',')[1]?.trim() || ''
        };
        updateUI(weatherData, cityInfo);
    }
});

tempFahrenheit.addEventListener('click', () => {
    currentUnit = 'fahrenheit';
    tempFahrenheit.querySelector('span:last-child').classList.remove('opacity-0');
    tempCelsius.querySelector('span:last-child').classList.add('opacity-0');
    if (weatherData) {
        const cityInfo = {
            name: document.querySelector('.weather-card h2').textContent.split(',')[0],
            country: document.querySelector('.weather-card h2').textContent.split(',')[1]?.trim() || ''
        };
        updateUI(weatherData, cityInfo);
    }
});

// Wind speed unit conversion
windKmh.addEventListener('click', () => {
    currentWindUnit = 'kmh';
    windKmh.querySelector('span:last-child').classList.remove('opacity-0');
    windMph.querySelector('span:last-child').classList.add('opacity-0');
    if (weatherData) {
        const cityInfo = {
            name: document.querySelector('.weather-card h2').textContent.split(',')[0],
            country: document.querySelector('.weather-card h2').textContent.split(',')[1]?.trim() || ''
        };
        updateUI(weatherData, cityInfo);
    }
});

windMph.addEventListener('click', () => {
    currentWindUnit = 'mph';
    windMph.querySelector('span:last-child').classList.remove('opacity-0');
    windKmh.querySelector('span:last-child').classList.add('opacity-0');
    if (weatherData) {
        const cityInfo = {
            name: document.querySelector('.weather-card h2').textContent.split(',')[0],
            country: document.querySelector('.weather-card h2').textContent.split(',')[1]?.trim() || ''
        };
        updateUI(weatherData, cityInfo);
    }
});

// Precipitation unit conversion
precipMm.addEventListener('click', () => {
    currentPrecipUnit = 'mm';
    precipMm.querySelector('span:last-child').classList.remove('opacity-0');
    precipIn.querySelector('span:last-child').classList.add('opacity-0');
    if (weatherData) {
        const cityInfo = {
            name: document.querySelector('.weather-card h2').textContent.split(',')[0],
            country: document.querySelector('.weather-card h2').textContent.split(',')[1]?.trim() || ''
        };
        updateUI(weatherData, cityInfo);
    }
});

precipIn.addEventListener('click', () => {
    currentPrecipUnit = 'in';
    precipIn.querySelector('span:last-child').classList.remove('opacity-0');
    precipMm.querySelector('span:last-child').classList.add('opacity-0');
    if (weatherData) {
        const cityInfo = {
            name: document.querySelector('.weather-card h2').textContent.split(',')[0],
            country: document.querySelector('.weather-card h2').textContent.split(',')[1]?.trim() || ''
        };
        updateUI(weatherData, cityInfo);
    }
});

// Load default city on page load (Berlin)
window.addEventListener('DOMContentLoaded', async () => {
    cityInput.value = 'Berlin';
    await searchWeather();
});