import type { FastifyInstance } from 'fastify';
import {
  listMessages,
  getMessagesSince,
  deleteAllMessages,
  createMessage,
  lookupMagicToError,
  lookupChannelPairError,
  channelOfAddress,
  normalizeAddress,
  type MessageChannel,
} from '../services/message.js';
import { broadcastNewMessage } from '../ws.js';

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

  // Inbound message the UI (or an e2e test) receives, the way a handset would.
  // Channel "whatsapp" stores Twilio's whatsapp:+E.164 addresses and status "received".
  fastify.post<{
    Body: {
      From?: string;
      To?: string;
      Body?: string;
      Channel?: string;
      AccountSid?: string;
    };
  }>('/api/messages', async (request, reply) => {
    const payload = request.body ?? {};
    const from = (payload.From || '').trim();
    const to = (payload.To || '').trim();
    const text = payload.Body ?? '';

    if (!from || !to || !String(text).trim()) {
      return reply.status(400).send({
        status: 400,
        message: 'Missing required parameter: From, To, and Body',
        code: 21201,
        more_info: 'https://www.twilio.com/docs/errors/21201',
      });
    }

    let channel: MessageChannel;
    if (payload.Channel) {
      const requested = payload.Channel.trim().toLowerCase();
      if (requested !== 'sms' && requested !== 'whatsapp') {
        return reply.status(400).send({
          status: 400,
          message: "Channel must be 'sms' or 'whatsapp'",
          code: 21201,
          more_info: 'https://www.twilio.com/docs/errors/21201',
        });
      }
      channel = requested;
    } else {
      const channelError = lookupChannelPairError(from, to);
      if (channelError) {
        return reply.status(400).send({
          status: 400,
          message: channelError.message,
          code: channelError.code,
          more_info: channelError.more_info,
        });
      }
      channel = channelOfAddress(from);
    }

    const magicError = lookupMagicToError(to);
    if (magicError) {
      return reply.status(400).send({
        status: 400,
        message: magicError.message,
        code: magicError.code,
        more_info: magicError.more_info,
      });
    }

    try {
      const message = createMessage(
        payload.AccountSid || 'ACdemo',
        {
          From: normalizeAddress(from, channel),
          To: normalizeAddress(to, channel),
          Body: text,
        },
        { direction: 'inbound', status: 'received' }
      );
      broadcastNewMessage(message);
      return reply.status(201).send(message);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        status: 500,
        message: 'Internal server error',
        code: 0,
        more_info: 'https://www.twilio.com/docs/errors',
      });
    }
  });
}