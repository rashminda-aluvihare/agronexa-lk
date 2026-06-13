const db = require('../config/db');

const nameMapping = {
  'Tomatoes': 'Tomatoes (තක්කාලි)',
  'Carrots': 'Carrots (කැරට්)',
  'Potatoes': 'Potatoes (අල)',
  'Green Chilies': 'Green Chilies (අමු මිරිස්)',
  'Leeks': 'Leeks (ලීක්ස්)',
  'Red Onion': 'Red Onion (රතු ළූණු)',
  'Beans': 'Beans (බෝංචි)'
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

module.exports = {
  getMarketPrices,
};
