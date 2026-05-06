import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initDatabase, closeDatabase } from './db.js';
import { messagesRoutes } from './routes/messages.js';
import { healthRoutes } from './routes/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOST = process.env.TWILIO_HOST || '0.0.0.0';
const PORT = parseInt(process.env.TWILIO_PORT || '4010', 10);

const fastify = Fastify({
  logger: true,
});

fastify.addContentTypeParser(
  'application/x-www-form-urlencoded',
  { parseAs: 'string' },
  (req, body, done) => {
    const params = new URLSearchParams(body as string);
    const obj: Record<string, string> = {};
    params.forEach((value, key) => {
      obj[key] = value;
    });
    done(null, obj);
  }
);

async function start() {
  try {
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    initDatabase();

    await fastify.register(messagesRoutes);
    await fastify.register(healthRoutes);

    fastify.get('/', async (_, reply) => {
      return reply.send({
        name: 'SMSPit',
        version: '1.0.0',
        description: 'Mock Twilio SMS Server',
        api_version: '2010-04-01',
        prefix: '/2010-04-01',
        api_port: PORT,
        web_port: 4011,
      });
    });

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`SMSPit API server running on http://${HOST}:${PORT}`);
    console.log(`API base: http://localhost:${PORT}/2010-04-01`);
    console.log(`Web UI: http://localhost:4011`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  closeDatabase();
  process.exit(0);
});

start();