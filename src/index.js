
        
        const unitsBtn = document.getElementById('unitsBtn');
        const dropdown = document.getElementById('dropdown');
        const searchInput = document.getElementById('searchInput');
        const suggestions = document.getElementById('suggestions');

        unitsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== unitsBtn) {
                dropdown.classList.add('hidden');
            }
        });

    
        searchInput.addEventListener('focus', () => {
            suggestions.classList.remove('hidden');
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => suggestions.classList.add('hidden'), 200);
        });

        
        let tempUnit = 'celsius';
        let windUnit = 'kmh';
        let precipUnit = 'mm';

        const baseTemps = {
            main: 20,
            feels: 18,
            hourly: { '3pm': 20, '4pm': 20, '5pm': 20, '6pm': 19, '7pm': 18, '8pm': 18, '9pm': 17, '10pm': 17 },
            daily: {
                tue: [20, 14],
                wed: [21, 15],
                thu: [24, 14],
                fri: [25, 13],
                sat: [21, 15],
                sun: [25, 16],
                mon: [24, 15]
            }
        };

        function celsiusToFahrenheit(c) {
            return Math.round((c * 9/5) + 32);
        }

        function updateTemperatures() {
            const symbol = '°';
            
            const mainTemp = tempUnit === 'celsius' ? baseTemps.main : celsiusToFahrenheit(baseTemps.main);
            const feelsTemp = tempUnit === 'celsius' ? baseTemps.feels : celsiusToFahrenheit(baseTemps.feels);
            
            document.getElementById('mainTemp').textContent = mainTemp + symbol;
            document.getElementById('feelsLike').textContent = feelsTemp + symbol;
            
            // Update hourly
            Object.keys(baseTemps.hourly).forEach(time => {
                const temp = tempUnit === 'celsius' ? baseTemps.hourly[time] : celsiusToFahrenheit(baseTemps.hourly[time]);
                const el = document.getElementById('temp' + time);
                if (el) el.textContent = temp + symbol;
            });

            // Update daily
            Object.keys(baseTemps.daily).forEach(day => {
                const high = tempUnit === 'celsius' ? baseTemps.daily[day][0] : celsiusToFahrenheit(baseTemps.daily[day][0]);
                const low = tempUnit === 'celsius' ? baseTemps.daily[day][1] : celsiusToFahrenheit(baseTemps.daily[day][1]);
                
                const highEl = document.getElementById(day + 'High');
                const lowEl = document.getElementById(day + 'Low');
                if (highEl) highEl.textContent = high + symbol;
                if (lowEl) lowEl.textContent = low + symbol;
            });
        }

        function updateWind() {
            const baseWindKmh = 14;
            const value = windUnit === 'kmh' ? baseWindKmh : Math.round(baseWindKmh * 0.621371);
            const unit = windUnit === 'kmh' ? 'km/h' : 'mph';
            document.getElementById('windSpeed').textContent = value + ' ' + unit;
        }

        function updatePrecipitation() {
            const basePrecipMm = 0;
            const value = precipUnit === 'mm' ? basePrecipMm : (basePrecipMm * 0.0393701).toFixed(2);
            const unit = precipUnit === 'mm' ? 'mm' : 'in';
            document.getElementById('precipitation').textContent = value + ' ' + unit;
        }

        // Temperature options
        document.getElementById('tempCelsius').addEventListener('click', () => {
            tempUnit = 'celsius';
            updateTemperatures();
            document.getElementById('tempCelsius').querySelector('span:last-child').classList.remove('opacity-0');
            document.getElementById('tempFahrenheit').querySelector('span:last-child').classList.add('opacity-0');
        });

        document.getElementById('tempFahrenheit').addEventListener('click', () => {
            tempUnit = 'fahrenheit';
            updateTemperatures();
            document.getElementById('tempFahrenheit').querySelector('span:last-child').classList.remove('opacity-0');
            document.getElementById('tempCelsius').querySelector('span:last-child').classList.add('opacity-0');
        });

        // Wind speed options
        document.getElementById('windKmh').addEventListener('click', () => {
            windUnit = 'kmh';
            updateWind();
            document.getElementById('windKmh').querySelector('span:last-child').classList.remove('opacity-0');
            document.getElementById('windMph').querySelector('span:last-child').classList.add('opacity-0');
        });

        document.getElementById('windMph').addEventListener('click', () => {
            windUnit = 'mph';
            updateWind();
            document.getElementById('windMph').querySelector('span:last-child').classList.remove('opacity-0');
            document.getElementById('windKmh').querySelector('span:last-child').classList.add('opacity-0');
        });

        // Precipitation options
        document.getElementById('precipMm').addEventListener('click', () => {
            precipUnit = 'mm';
            updatePrecipitation();
            document.getElementById('precipMm').querySelector('span:last-child').classList.remove('opacity-0');
            document.getElementById('precipIn').querySelector('span:last-child').classList.add('opacity-0');
        });

        document.getElementById('precipIn').addEventListener('click', () => {
            precipUnit = 'in';
            updatePrecipitation();
            document.getElementById('precipIn').querySelector('span:last-child').classList.remove('opacity-0');
            document.getElementById('precipMm').querySelector('span:last-child').classList.add('opacity-0');
        });

