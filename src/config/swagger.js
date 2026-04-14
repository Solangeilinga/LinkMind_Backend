/**
 * Swagger/OpenAPI Documentation
 * Auto-generated API documentation
 * Run: npm run docs
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LinkMind API',
      version: '1.0.1',
      description: 'Student Mental Health Platform API Documentation',
      contact: {
        name: 'LinkMind Team',
        email: 'support@linkmind.app',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phoneNumber: { type: 'string' },
            age: { type: 'integer', minimum: 13, maximum: 120 },
            profileImg: { type: 'string', nullable: true },
            points: { type: 'integer', default: 0 },
            level: { type: 'string', enum: ['bronze', 'silver', 'gold', 'platinum'] },
            accountStatus: { type: 'string', enum: ['active', 'locked', 'suspended'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MoodEntry: {
          type: 'object',
          required: ['score', 'label'],
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            score: { type: 'integer', minimum: 1, maximum: 5 },
            label: { type: 'string' },
            energy: { type: 'integer', minimum: 1, maximum: 5, nullable: true },
            factors: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string', maxLength: 500 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Challenge: {
          type: 'object',
          required: ['title', 'difficulty', 'points'],
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'extreme'] },
            points: { type: 'integer', minimum: 1 },
            duration: { type: 'integer', description: 'Duration in minutes' },
            category: { type: 'string' },
            isActive: { type: 'boolean', default: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
            message: { type: 'string' },
            errorCode: { type: 'string' },
            statusCode: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

/**
 * Setup Swagger documentation
 * @param {Express.Application} app - Express app
 */
function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(specs, {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: 1,
    },
  }));

  // JSON specs endpoint
  app.get('/api/specifications', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  return specs;
}

module.exports = {
  setupSwagger,
  specs: () => specs,
};
