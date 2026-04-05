const redis = require('redis');

const client = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Redis reconnect attempt #${retries}...`);
      return 2000;
    }
  }
});

client.on('error', (err) => console.error('Redis error:', err.message));
client.on('connect', () => console.log('Redis connected.'));

client.connect().catch(console.error);

module.exports = client;
