import type { FastifyInstance } from 'fastify';
import { listMessages, getMessagesSince, deleteAllMessages } from '../services/message.js';

interface MessagesQuery {
  lastPoll?: string;
  to?: string;
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  fastify.get<{
    Querystring: MessagesQuery;
  }>('/api/messages', async (request, reply) => {
    const { lastPoll, to } = request.query;

    if (lastPoll) {
      const messages = getMessagesSince('', lastPoll, { to });
      return reply.send({
        messages,
        timestamp: new Date().toISOString(),
        isPolling: true,
      });
    }

    const result = listMessages('', { page: 1, pageSize: 100, to });
    return reply.send({
      messages: result.messages,
      total: result.total,
      timestamp: new Date().toISOString(),
      isPolling: false,
    });
  });

  fastify.delete('/api/messages', async (_, reply) => {
    const deleted = deleteAllMessages();
    return reply.send({ deleted });
  });
}