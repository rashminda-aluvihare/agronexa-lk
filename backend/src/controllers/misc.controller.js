/**
 * GET /api/market-prices
 */
function getMarketPrices(req, res) {
  const cropPrices = [
    { name: 'Tomatoes (තක්කාලි)', category: 'Vegetables', avgPrice: 180, change: -2.4, history: [192, 188, 185, 181, 184, 182, 180] },
    { name: 'Carrots (කැරට්)', category: 'Vegetables', avgPrice: 240, change: 4.8, history: [225, 228, 230, 235, 232, 238, 240] },
    { name: 'Potatoes (අල)', category: 'Grains/Tubers', avgPrice: 155, change: 1.2, history: [151, 153, 152, 155, 154, 153, 155] },
    { name: 'Green Chilies (අමු මිරිස්)', category: 'Spices', avgPrice: 320, change: -1.5, history: [335, 330, 328, 322, 325, 324, 320] },
    { name: 'Leeks (ලීක්ස්)', category: 'Vegetables', avgPrice: 140, change: 0.5, history: [138, 142, 139, 141, 140, 139, 140] },
    { name: 'Red Onion (රතු ළූණු)', category: 'Spices', avgPrice: 280, change: 2.1, history: [272, 275, 274, 278, 275, 279, 280] },
    { name: 'Beans (බෝංචි)', category: 'Vegetables', avgPrice: 210, change: -0.8, history: [218, 215, 212, 214, 210, 212, 210] },
  ];
  return res.json({ success: true, prices: cropPrices });
}

module.exports = {
  getMarketPrices,
};
