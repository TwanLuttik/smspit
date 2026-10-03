import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createMessage, listMessages, getMessage, deleteMessage, lookupMagicToError, lookupChannelPairError } from '../services/message.js';
import type { CreateMessageInput } from '../types/index.js';
import { broadcastNewMessage } from '../ws.js';

interface MessageParams {
  accountSid: string;
  sid?: string;
}

export async function messagesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Params: { accountSid: string };
    Body: CreateMessageInput;
  }>('/2010-04-01/Accounts/:accountSid/Messages.json', async (request, reply) => {
    const { accountSid } = request.params;
    const input = request.body as CreateMessageInput;

    if (!input.To) {
      return reply.status(400).send({
        status: 400,
        message: 'Missing required parameter: To',
        code: 21201,
        more_info: 'https://www.twilio.com/docs/errors/21201',
      });
    }

    if (!input.From && !input.MessagingServiceSid) {
      return reply.status(400).send({
        status: 400,
        message: 'Missing required parameter: From or MessagingServiceSid',
        code: 21201,
        more_info: 'https://www.twilio.com/docs/errors/21201',
      });
    }

    if (!input.Body && !input.MediaUrl && !input.ContentSid) {
      return reply.status(400).send({
        status: 400,
        message: 'Missing required parameter: Body, MediaUrl, or ContentSid',
        code: 21201,
        more_info: 'https://www.twilio.com/docs/errors/21201',
      });
    }

    const magicError = lookupMagicToError(input.To);
    if (magicError) {
      return reply.status(400).send({
        status: 400,
        message: magicError.message,
        code: magicError.code,
        more_info: magicError.more_info,
      });
    }

    if (input.From) {
      const channelError = lookupChannelPairError(input.From, input.To);
      if (channelError) {
        return reply.status(400).send({
          status: 400,
          message: channelError.message,
          code: channelError.code,
          more_info: channelError.more_info,
        });
      }
    }

    try {
      const message = createMessage(accountSid, input);
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

  fastify.get<{
    Params: { accountSid: string };
    Querystring: {
      Page?: string;
      PageSize?: string;
      From?: string;
      To?: string;
      Status?: string;
      BodyContains?: string;
    };
  }>('/2010-04-01/Accounts/:accountSid/Messages.json', async (request, reply) => {
    const { accountSid } = request.params;
    const { Page, PageSize, From, To, Status, BodyContains } = request.query;

    const page = Page ? parseInt(Page, 10) : 1;
    const pageSize = PageSize ? parseInt(PageSize, 10) : 50;

    const result = listMessages(accountSid, {
      page,
      pageSize,
      from: From,
      to: To,
      status: Status,
      bodySearch: BodyContains,
    });

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, result.total);
    const totalPages = Math.ceil(result.total / pageSize);

    return reply.send({
      messages: result.messages,
      meta: {
        page,
        page_size: pageSize,
        first_page_uri: `/2010-04-01/Accounts/${accountSid}/Messages.json?Page=1&PageSize=${pageSize}`,
        next_page_uri: page < totalPages
          ? `/2010-04-01/Accounts/${accountSid}/Messages.json?Page=${page + 1}&PageSize=${pageSize}`
          : null,
        previous_page_uri: page > 1
          ? `/2010-04-01/Accounts/${accountSid}/Messages.json?Page=${page - 1}&PageSize=${pageSize}`
          : null,
        uri: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      },
    });
  });

  fastify.get<{
    Params: { accountSid: string; sid: string };
  }>('/2010-04-01/Accounts/:accountSid/Messages/:sid.json', async (request, reply) => {
    const { accountSid, sid } = request.params;

    const message = getMessage(accountSid, sid);
    if (!message) {
      return reply.status(404).send({
        status: 404,
        message: 'Message not found',
        code: 20404,
        more_info: 'https://www.twilio.com/docs/errors/20404',
      });
    }

    return reply.send(message);
  });

  fastify.delete<{
    Params: { accountSid: string; sid: string };
  }>('/2010-04-01/Accounts/:accountSid/Messages/:sid.json', async (request, reply) => {
    const { accountSid, sid } = request.params;

    const deleted = deleteMessage(accountSid, sid);
    if (!deleted) {
      return reply.status(404).send({
        status: 404,
        message: 'Message not found',
        code: 20404,
        more_info: 'https://www.twilio.com/docs/errors/20404',
      });
    }

    return reply.status(204).send();
  });
}