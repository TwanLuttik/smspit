import type { FastifyInstance } from 'fastify';
import { listMessages, getMessagesSince } from '../services/message.js';

interface PollQuery {
  lastPoll?: string;
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  fastify.get<{
    Querystring: PollQuery;
  }>('/api/messages', async (request, reply) => {
    const { lastPoll } = request.query;

    if (lastPoll) {
      const messages = getMessagesSince('', lastPoll);
      return reply.send({
        messages,
        timestamp: new Date().toISOString(),
        isPolling: true,
      });
    }

    const result = listMessages('', { page: 1, pageSize: 100 });
    return reply.send({
      messages: result.messages,
      total: result.total,
      timestamp: new Date().toISOString(),
      isPolling: false,
    });
  });
}