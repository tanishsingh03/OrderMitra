const createLogger = require('./logger');
const RabbitMQManager = require('./rabbitmq');
const eventTypes = require('./constants/events');
const { authenticate, authorize } = require('./middlewares/auth');
const errorHandler = require('./middlewares/errors');

module.exports = {
  createLogger,
  RabbitMQManager,
  eventTypes,
  authenticate,
  authorize,
  errorHandler
};
