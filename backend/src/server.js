require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const { createApp } = require('./app');
const { attachSocket } = require('./socket');
const { initDatabase } = require('./config/db');

async function start() {
  // Run database migrations on start
  await initDatabase();

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

