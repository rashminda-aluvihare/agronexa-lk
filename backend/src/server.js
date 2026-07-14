//HARTI

require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const { createApp } = require('./app');
const { attachSocket } = require('./socket');
const { initDatabase } = require('./config/db');
const { updateMarketPrices } = require('./services/scraper.service');
const { initSystemSettings } = require('./services/system.service');

async function start() {
  // Run database migrations on start
  await initDatabase();

  // Load and cache system settings (like maintenance status)
  await initSystemSettings();

  // Run scraper to seed/update prices on startup
  updateMarketPrices().catch((err) => {
    console.error('❌ Failed to run daily crop prices scraper on startup:', err.message);
  });

  // Schedule daily crop prices scraper (every 24 hours)
  setInterval(() => {
    updateMarketPrices().catch((err) => {
      console.error('❌ Scheduled daily crop prices scraper update failed:', err.message);
    });
  }, 24 * 60 * 60 * 1000);  //Milisecond in to 24 hours 

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
  });

  attachSocket(io);

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 AgroNexa LK backend listening on ${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Server start error:', err);
  process.exit(1);
});

