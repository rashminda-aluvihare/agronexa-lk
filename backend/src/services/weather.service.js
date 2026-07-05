

const axios = require('axios');

// District weather fallback coordinates & agricultural advice for Sri Lanka
const DISTRICT_COORDINATES = {
  'Nuwara Eliya': { temp: 18, condition: 'Rainy', advice: 'Heavy rain expected. Ensure proper drainage in vegetable beds and protect crops against fungal disease.' },
  'Badulla': { temp: 24, condition: 'Partly Cloudy', advice: 'Moderate temperature. Ideal for harvesting potatoes and tea leaves.' },
  'Anuradhapura': { temp: 31, condition: 'Sunny', advice: 'Dry weather expected. Apply drip irrigation to paddy and grain crops to preserve water.' },
  'Dambulla': { temp: 29, condition: 'Sunny', advice: 'Favorable conditions for vegetable harvest and transport to wholesale market.' },
  'Jaffna': { temp: 32, condition: 'Sunny', advice: 'High temperatures. Water chilli and onion crops early morning to prevent wilting.' },
  'Colombo': { temp: 30, condition: 'Cloudy', advice: 'Humid conditions. Monitor stored grains for moisture and fungal growth.' },
};

async function getWeatherAdvisory(district = 'Nuwara Eliya') {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const defaultData = DISTRICT_COORDINATES[district] || DISTRICT_COORDINATES['Nuwara Eliya'];

  if (!apiKey) {
    // Graceful Fallback if API key is not configured
    return {
      district,
      temperature: `${defaultData.temp}°C`,
      condition: defaultData.condition,
      advisory: defaultData.advice,
      is_simulated: true,
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(district)},LK&units=metric&appid=${apiKey}`;
    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    const temp = Math.round(data.main.temp);
    const condition = data.weather[0].main;
    let advice = 'Favorable weather conditions for agricultural activities.';

    if (condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle')) {
      advice = 'Rain expected in your district. Delay pesticide applications and protect sensitive crops against waterlogging.';
    } else if (temp > 30) {
      advice = 'High temperatures detected. Increase irrigation frequency for young seedlings.';
    }

    return {
      district,
      temperature: `${temp}°C`,
      condition,
      humidity: `${data.main.humidity}%`,
      advisory: advice,
      is_simulated: false,
    };
  } catch (err) {
    return {
      district,
      temperature: `${defaultData.temp}°C`,
      condition: defaultData.condition,
      advisory: defaultData.advice,
      is_simulated: true,
    };
  }
}

module.exports = {
  getWeatherAdvisory,
};
