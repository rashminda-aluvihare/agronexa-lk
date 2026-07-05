const db = require('../config/db');

const nameMapping = {
  'Tomatoes': 'Tomatoes (තක්කාලි)',
  'Carrots': 'Carrots (කැරට්)',
  'Potatoes': 'Potatoes (අල)',
  'Green Chilies': 'Green Chilies (අමු මිරිස්)',
  'Leeks': 'Leeks (ලීක්ස්)',
  'Red Onion': 'Red Onion (රතු ළූණු)',
  'Beans': 'Beans (බෝංචි)',
  'Cabbage': 'Cabbage (ගෝවා)',
  'Pumpkin': 'Pumpkin (වට්ටක්කා)',
  'Brinjal': 'Brinjal (වම්බටු)',
  'Ladies Finger': 'Ladies Finger (බණ්ඩක්කා)',
  'Bitter Gourd': 'Bitter Gourd (කරවිල)',
  'Snake Gourd': 'Snake Gourd (පතෝල)',
  'Luffa': 'Luffa (වැටකොළු)',
  'Cucumber': 'Cucumber (පිපිඤ්ඤා)',
  'Beetroot': 'Beetroot (බීට්රූට්)',
  'Radish': 'Radish (රාබු)',
  'Knolkhol': 'Knolkhol (නෝකෝල්)',
  'Capsicum': 'Capsicum (මාළු මිරිස්)',
  'Samba Rice': 'Samba Rice (සම්බා සහල්)',
  'Nadu Rice': 'Nadu Rice (නාඩු සහල්)',
  'Red Rice': 'Red Rice (රතු සහල්)',
  'Coconut': 'Coconut (පොල්)',
  'Sweet Potato': 'Sweet Potato (බතල)',
  'Manioc': 'Manioc (ඤෙඤ්ඤොක්කා)',
  'Garlic': 'Garlic (සුදු ළූණු)',
  'Ginger': 'Ginger (ඉඟුරු)',
  'Lime': 'Lime (දෙහි)',
  'Dried Chilies': 'Dried Chilies (වියළි මිරිස්)',
  'Banana': 'Banana (කෙසෙල්)'
};

/**
 * GET /api/market-prices
 */
async function getMarketPrices(req, res) {
  try {
    const result = await db.query('SELECT * FROM market_prices ORDER BY id ASC');
    const prices = result.rows.map(row => ({
      name: nameMapping[row.name] || row.name,
      category: row.category,
      avgPrice: parseFloat(Number(row.avg_price).toFixed(2)),
      change: parseFloat(Number(row.change).toFixed(2)),
      history: (row.history || []).map(Number)
    }));
    return res.json({ success: true, prices });
  } catch (err) {
    console.error('Error fetching market prices:', err.message);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}

/**
 * GET /api/public-stats
 */
async function getPublicStats(req, res) {
  try {
    const result = await db.query("SELECT COUNT(*) FROM users WHERE role = 'farmer' OR role = 'seller'");
    const farmerCount = parseInt(result.rows[0].count, 10);
    return res.json({ success: true, farmerCount });
  } catch (err) {
    console.error('Error fetching public stats:', err.message);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}

/**
 * GET /api/weather-advisory?district=Nuwara%20Eliya
 */
async function getWeatherAdvisoryHandler(req, res) {
  const { district } = req.query;
  const weatherService = require('../services/weather.service');
  try {
    const data = await weatherService.getWeatherAdvisory(district);
    return res.json({ success: true, weather: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getMarketPrices,
  getPublicStats,
  getWeatherAdvisoryHandler,
};

