/**
 * GET /api/market-prices
 */
function getMarketPrices(req, res) {
  const cropPrices = [
    { name: 'Tomatoes (තක්කාලි)', category: 'Vegetables', avgPrice: 180, change: -2.4 },
    { name: 'Carrots (කැරට්)', category: 'Vegetables', avgPrice: 240, change: 4.8 },
    { name: 'Potatoes (අල)', category: 'Grains/Tubers', avgPrice: 155, change: 1.2 },
    { name: 'Green Chilies (අමු මිරිස්)', category: 'Spices', avgPrice: 320, change: -1.5 },
    { name: 'Leeks (ලීක්ස්)', category: 'Vegetables', avgPrice: 140, change: 0.5 },
    { name: 'Red Onion (රතු ළූණු)', category: 'Spices', avgPrice: 280, change: 2.1 },
    { name: 'Beans (බෝංචි)', category: 'Vegetables', avgPrice: 210, change: -0.8 },
  ];
  return res.json({ success: true, prices: cropPrices });
}

module.exports = {
  getMarketPrices,
};
