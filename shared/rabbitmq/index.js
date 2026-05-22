const amqp = require('amqplib');

class RabbitMQManager {
  constructor(logger) {
    this.logger = logger;
    this.connection = null;
    this.channel = null;
    this.exchangeName = 'ordermitra.events';
    this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    this.retryDelay = 5000;
  }

  async connect() {
    let connected = false;
    while (!connected) {
      try {
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createChannel();
        
        // Assert the main topic exchange
        await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
        
        this.connection.on('error', (err) => {
          this.logger.error('RabbitMQ connection error, reconnecting...', err);
          setTimeout(() => this.connect(), this.retryDelay);
        });

        this.connection.on('close', () => {
          this.logger.error('RabbitMQ connection closed, reconnecting...');
          setTimeout(() => this.connect(), this.retryDelay);
        });

        this.logger.info('🔌 Connected to RabbitMQ successfully');
        connected = true;
      } catch (err) {
        this.logger.error(`Failed to connect to RabbitMQ at ${this.url}, retrying in 5s...`, err);
        await new Promise((res) => setTimeout(res, this.retryDelay));
      }
    }
  }

  async publish(routingKey, data) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }
      const message = Buffer.from(JSON.stringify(data));
      this.channel.publish(this.exchangeName, routingKey, message, {
        persistent: true
      });
      this.logger.info(`✉️ Event published: ${routingKey}`);
    } catch (err) {
      this.logger.error(`Failed to publish event ${routingKey}:`, err);
      throw err;
    }
  }

  async consume(queueName, routingKeys, onMessage) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      // Assert queue
      const dlqName = `${queueName}.dlq`;
      
      // Assert DLQ Exchange and Queue
      const dlqExchange = 'ordermitra.dlx';
      await this.channel.assertExchange(dlqExchange, 'direct', { durable: true });
      await this.channel.assertQueue(dlqName, { durable: true });
      await this.channel.bindQueue(dlqName, dlqExchange, queueName);

      // Assert Main Queue with DLQ config
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': dlqExchange,
          'x-dead-letter-routing-key': queueName
        }
      });

      // Bind to main exchange for all requested routing keys
      for (const rk of routingKeys) {
        await this.channel.bindQueue(queueName, this.exchangeName, rk);
      }

      this.channel.consume(queueName, async (msg) => {
        if (!msg) return;
        try {
          const content = JSON.parse(msg.content.toString());
          this.logger.info(`📥 Event received: ${msg.fields.routingKey} in ${queueName}`);
          
          await onMessage(msg.fields.routingKey, content);
          this.channel.ack(msg);
        } catch (err) {
          this.logger.error(`Error processing message in queue ${queueName}:`, err);
          // Nack and send to DLQ (requeue: false)
          this.channel.nack(msg, false, false);
        }
      }, { noAck: false });

      this.logger.info(`🎧 Consuming queue ${queueName} bound to: ${routingKeys.join(', ')}`);
    } catch (err) {
      this.logger.error(`Failed to setup consumer for queue ${queueName}:`, err);
      throw err;
    }
  }
}

module.exports = RabbitMQManager;
