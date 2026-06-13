const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../config/db');

// Map of keywords to match in HARTI page tables
const CROP_MAPPING = {
  'Tomatoes': ['Tomato', 'Tomato (Local)', 'තක්කාලි'],
  'Carrots': ['Carrot', 'කැරට්'],
  'Potatoes': ['Potato', 'Potato (Local)', 'අල'],
  'Green Chilies': ['Green Chillie', 'Green Chilies', 'අමු මිරිස්'],
  'Leeks': ['Leeks', 'ලීක්ස්'],
  'Red Onion': ['Red Onion', 'Red Onion (Local)', 'රතු ළූණු'],
  'Beans': ['Beans', 'බෝංචි'],
  'Cabbage': ['Cabbage', 'ගෝවා'],
  'Pumpkin': ['Pumpkin', 'වට්ටක්කා'],
  'Brinjal': ['Brinjal', 'Eggplant', 'වම්බටු'],
  'Ladies Finger': ['Ladies Finger', 'Okra', 'බණ්ඩක්කා'],
  'Bitter Gourd': ['Bitter Gourd', 'කරවිල'],
  'Snake Gourd': ['Snake Gourd', 'පතෝල'],
  'Luffa': ['Luffa', 'Ridge Gourd', 'වැටකොළු'],
  'Cucumber': ['Cucumber', 'පිපිඤ්ඤා'],
  'Beetroot': ['Beetroot', 'බීට්රූට්'],
  'Radish': ['Radish', 'රාබု'],
  'Knolkhol': ['Knolkhol', 'නෝකෝල්'],
  'Capsicum': ['Capsicum', 'මාළු මිරිස්'],
  'Samba Rice': ['Samba Rice', 'Samba', 'සම්බා සහල්'],
  'Nadu Rice': ['Nadu Rice', 'Nadu', 'නාඩු සහල්'],
  'Red Rice': ['Red Rice', 'රතු සහල්'],
  'Coconut': ['Coconut', 'පොල්'],
  'Sweet Potato': ['Sweet Potato', 'බතල'],
  'Manioc': ['Manioc', 'Cassava', 'ඤෙඤ්ඤොක්කා'],
  'Garlic': ['Garlic', 'සුදු ළූණු'],
  'Ginger': ['Ginger', 'ඉඟුරු'],
  'Lime': ['Lime', 'දෙහි'],
  'Dried Chilies': ['Dried Chillie', 'Dried Chilies', 'වියළි මිරිස්'],
  'Banana': ['Banana', 'කෙසෙල්']
};

/**
 * Runs the scraper to fetch prices from HARTI.
 * If scraping fails or cannot find data, it runs a fallback simulator to update prices.
 */
async function updateMarketPrices() {
  console.log('🔄 Starting daily crop prices update...');
  let scrapedCount = 0;
  const scrapedPrices = {};

  try {
    // 1. Fetch HARTI Daily Price Page
    const response = await axios.get('http://www.harti.gov.lk/index.php/en/market-information/daily-price', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // 2. Locate tables and rows
    $('table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const itemText = $(cells[0]).text().trim().toLowerCase();
        // HARTI daily tables usually have: Commodity | Wholesale Range | Retail Range
        // Let's get the wholesale price (second column)
        const wholesaleText = $(cells[1]).text().trim();
        // Parse numerical values from wholesale range (e.g., "160.00-180.00" -> average 170)
        const parsedPrice = parseAveragePrice(wholesaleText);

        if (itemText && parsedPrice > 0) {
          // Check if item matches any of our crops
          for (const [key, aliases] of Object.entries(CROP_MAPPING)) {
            const matched = aliases.some(alias => itemText.includes(alias.toLowerCase()));
            if (matched) {
              scrapedPrices[key] = parsedPrice;
              scrapedCount++;
            }
          }
        }
      }
    });
  } catch (err) {
    console.warn('⚠️ Web scraping failed or timed out:', err.message);
  }

  // 3. Process database updates
  try {
    const res = await db.query('SELECT * FROM market_prices');
    const existingCrops = res.rows;

    for (const crop of existingCrops) {
      let newPrice = crop.avg_price;
      let isFallback = true;

      if (scrapedPrices[crop.name]) {
        newPrice = scrapedPrices[crop.name];
        isFallback = false;
      } else {
        // Fallback: Apply a small random fluctuation (+/- 1% to 4%)
        const fluctuationPercent = (Math.random() * 6 - 3) / 100; // -3% to +3%
        newPrice = parseFloat((crop.avg_price * (1 + fluctuationPercent)).toFixed(2));
      }

      // Calculate percentage change
      const previousPrice = crop.avg_price;
      const change = parseFloat((((newPrice - previousPrice) / previousPrice) * 100).toFixed(1));

      // Update history array (keep last 7 items)
      let history = crop.history || [];
      // Ensure numerical conversion
      history = history.map(Number);
      history.push(parseFloat(newPrice));
      if (history.length > 7) {
        history.shift();
      }

      // Save to database
      await db.query(
        `UPDATE market_prices 
         SET avg_price = $1, change = $2, history = $3, updated_at = NOW() 
         WHERE id = $4`,
        [newPrice, change, history, crop.id]
      );
      
      console.log(`📊 Updated "${crop.name}": Rs. ${newPrice} (${change > 0 ? '+' : ''}${change}%) ${isFallback ? '[Simulated]' : '[Live Scraped]'}`);
    }
    console.log('✅ Daily crop prices update complete.');
  } catch (dbErr) {
    console.error('❌ Failed to save updated crop prices in database:', dbErr.message);
  }
}

/**
 * Helper to parse price ranges (e.g. "180-220" or "Rs.180" -> 200)
 */
function parseAveragePrice(text) {
  const clean = text.replace(/[^0-9.\-]/g, ''); // keep only numbers, dots, and hyphens
  if (clean.includes('-')) {
    const parts = clean.split('-').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return (parts[0] + parts[1]) / 2;
    }
  }
  const single = Number(clean);
  return isNaN(single) ? 0 : single;
}

module.exports = {
  updateMarketPrices
};
