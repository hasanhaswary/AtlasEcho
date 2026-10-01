import express from 'express';

const router = express.Router();

// Convert WMO Weather Interpretation Codes to condition text and icon
function getWeatherCondition(code) {
  if (code === 0) return { text: 'Sunny & Clear', icon: 'sun' };
  if (code >= 1 && code <= 3) return { text: 'Partly Overcast', icon: 'cloud' };
  if (code >= 45 && code <= 48) return { text: 'Foggy & Mist', icon: 'cloud-fog' };
  if (code >= 51 && code <= 67) return { text: 'Light Rain', icon: 'cloud-rain' };
  if (code >= 71 && code <= 77) return { text: 'Snowing', icon: 'snowflake' };
  if (code >= 80 && code <= 82) return { text: 'Showers', icon: 'cloud-rain' };
  if (code >= 95) return { text: 'Thunderstorm', icon: 'cloud-lightning' };
  return { text: 'Clear Sky', icon: 'sun' };
}

router.get('/', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat || '40.6281');
    const lng = parseFloat(req.query.lng || '14.4850');
    const requestedUnit = (req.query.unit || '').toLowerCase();
    const isCelsius = requestedUnit === 'celsius' || requestedUnit === 'c';
    const tempUnitParam = isCelsius ? 'celsius' : 'fahrenheit';

    // Fetch live weather from Open-Meteo (free & open)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=${tempUnitParam}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();
    const current = data.current_weather;
    const { text, icon } = getWeatherCondition(current.weathercode);
    const symbol = isCelsius ? '°C' : '°F';
    const tempStr = `${Math.round(current.temperature)}${symbol}`;

    res.json({
      temperature: tempStr,
      condition: text,
      icon,
      unit: isCelsius ? 'Celsius' : 'Fahrenheit',
      rawTemp: current.temperature,
      latitude: lat,
      longitude: lng
    });
  } catch (error) {
    console.warn('Weather fetch warning (falling back to default):', error.message);
    const isCelsius = (req.query.unit || '').toLowerCase().startsWith('c');
    res.json({
      temperature: isCelsius ? '22°C' : '72°F',
      condition: 'Sunny & Clear',
      icon: 'sun'
    });
  }
});

export default router;
