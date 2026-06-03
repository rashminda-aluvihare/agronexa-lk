const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

function setupSwagger(app) {
  const enabled = process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (!enabled) return;

  const spec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'AgroNexa LK API',
        version: '1.0.0',
      },
      servers: [{ url: process.env.PUBLIC_API_BASE_URL || '/' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}

module.exports = { setupSwagger };


