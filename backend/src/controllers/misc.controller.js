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

/**
 * GET /api/announcements
 */
async function getActiveAnnouncements(req, res) {
  try {
    let userRole = 'all';
    let userDistrict = 'all';

    if (req.auth && req.auth.role !== 'admin') {
      const userRes = await db.query("SELECT role, district FROM users WHERE id = $1", [req.auth.id]);
      if (userRes.rows.length > 0) {
        const rawRole = userRes.rows[0].role;
        userRole = (rawRole === 'farmer' || rawRole === 'seller') ? 'farmer' : 'buyer';
        userDistrict = userRes.rows[0].district || 'all';
      }
    }

    let query = `
      SELECT id, title, message, alert_type, starts_at, expires_at, created_at, target_audience, target_district
      FROM announcements 
      WHERE (expires_at IS NULL OR expires_at >= NOW())
    `;
    const params = [];

    // Admins bypass filter and see all announcements
    if (!req.auth || req.auth.role !== 'admin') {
      query += `
        AND (target_audience = 'all' OR target_audience = $1)
        AND (target_district = 'all' OR LOWER(target_district) = LOWER($2))
      `;
      params.push(userRole, userDistrict);
    }

    query += ` ORDER BY starts_at DESC`;

    const result = await db.query(query, params);
    return res.json({ success: true, announcements: result.rows });
  } catch (err) {
    console.error('Error fetching active announcements:', err.message);
    return res.status(500).json({ success: false, error: 'Database query failed' });
  }
}

/**
 * GET /api/system/maintenance
 */
function getMaintenanceStatus(req, res) {
  const systemService = require('../services/system.service');
  return res.json({
    success: true,
    active: systemService.isMaintenanceActive(),
    message: systemService.getMaintenanceMessage()
  });
}

module.exports = {
  getMarketPrices,
  getPublicStats,
  getWeatherAdvisoryHandler,
  getActiveAnnouncements,
  getMaintenanceStatus,
};

