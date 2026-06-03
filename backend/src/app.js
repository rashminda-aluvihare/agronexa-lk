const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middlewares/errorHandler');
const { notFoundHandler } = require('./middlewares/notFoundHandler');

const { apiRouter } = require('./routes');
const { setupSwagger } = require('./docs/swagger');

function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    })
  );

  // Rate limiting (global)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: parseInt(process.env.RATE_LIMIT || '300', 10),
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api', apiRouter);
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Swagger
  setupSwagger(app);

  // 404 + error
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

