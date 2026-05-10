import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createCall, listCalls, getCall, getCallsSince, updateCallStatus } from '../services/call.js';
import type { CreateCallInput, CallStatus } from '../types/index.js';
import { broadcastNewCall, broadcastCallUpdate } from '../ws.js';

interface CallParams {
  accountSid: string;
  sid?: string;
}

export async function callsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Params: { accountSid: string };
    Body: CreateCallInput;
  }>('/2010-04-01/Accounts/:accountSid/Calls.json', async (request, reply) => {
    const { accountSid } = request.params;
    const input = request.body as CreateCallInput;

    if (!input.To) {
      return reply.status(400).send({
        status: 400,
        message: 'Missing required parameter: To',
        code: 21201,
        more_info: 'https://www.twilio.com/docs/errors/21201',
      });
    }

    if (!input.From) {
      return reply.status(400).send({
        status: 400,
        message: 'Missing required parameter: From',
        code: 21201,
        more_info: 'https://www.twilio.com/docs/errors/21201',
      });
    }

    if (!input.Url && !input.Twiml && !input.ApplicationSid) {
      return reply.status(400).send({
        status: 400,
        message: 'Missing required parameter: Url, Twiml, or ApplicationSid',
        code: 21201,
        more_info: 'https://www.twilio.com/docs/errors/21201',
      });
    }

    try {
      const call = createCall(accountSid, input);
      broadcastNewCall(call);
      return reply.status(201).send(call);
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
    };
  }>('/2010-04-01/Accounts/:accountSid/Calls.json', async (request, reply) => {
    const { accountSid } = request.params;
    const { Page, PageSize, From, To, Status } = request.query;

    const page = Page ? parseInt(Page, 10) : 1;
    const pageSize = PageSize ? parseInt(PageSize, 10) : 50;

    const result = listCalls(accountSid, {
      page,
      pageSize,
      from: From,
      to: To,
      status: Status,
    });

    const totalPages = Math.ceil(result.total / pageSize);

    return reply.send({
      calls: result.calls,
      meta: {
        page,
        page_size: pageSize,
        first_page_uri: `/2010-04-01/Accounts/${accountSid}/Calls.json?Page=1&PageSize=${pageSize}`,
        next_page_uri: page < totalPages
          ? `/2010-04-01/Accounts/${accountSid}/Calls.json?Page=${page + 1}&PageSize=${pageSize}`
          : null,
        previous_page_uri: page > 1
          ? `/2010-04-01/Accounts/${accountSid}/Calls.json?Page=${page - 1}&PageSize=${pageSize}`
          : null,
        uri: `/2010-04-01/Accounts/${accountSid}/Calls.json`,
      },
    });
  });

  fastify.get<{
    Params: { accountSid: string; sid: string };
  }>('/2010-04-01/Accounts/:accountSid/Calls/:sid.json', async (request, reply) => {
    const { accountSid, sid } = request.params;

    const call = getCall(accountSid, sid);
    if (!call) {
      return reply.status(404).send({
        status: 404,
        message: 'Call not found',
        code: 20404,
        more_info: 'https://www.twilio.com/docs/errors/20404',
      });
    }

    return reply.send(call);
  });

  // Update a call (used for hang up / status change)
  fastify.post<{
    Params: { accountSid: string; sid: string };
    Body: { Status?: string };
  }>('/2010-04-01/Accounts/:accountSid/Calls/:sid.json', async (request, reply) => {
    const { accountSid, sid } = request.params;
    const { Status } = request.body as any;

    if (!Status) {
      return reply.status(400).send({
        status: 400,
        message: 'Missing required parameter: Status',
        code: 21201,
      });
    }

    const allowedStatuses: CallStatus[] = ['completed', 'busy', 'failed', 'no-answer', 'canceled', 'in-progress', 'answered'];
    if (!allowedStatuses.includes(Status as CallStatus)) {
      return reply.status(400).send({
        status: 400,
        message: `Invalid status: ${Status}`,
        code: 21201,
      });
    }

    const updated = updateCallStatus(accountSid, sid, Status as CallStatus);
    if (!updated) {
      return reply.status(404).send({
        status: 404,
        message: 'Call not found',
        code: 20404,
      });
    }

    broadcastCallUpdate(updated);
    return reply.send(updated);
  });

  // Internal API for web UI polling (calls)
  fastify.get<{
    Querystring: { lastPoll?: string };
  }>('/api/calls', async (request, reply) => {
    const { lastPoll } = request.query;

    if (lastPoll) {
      const calls = getCallsSince('', lastPoll);
      return reply.send({
        calls,
        timestamp: new Date().toISOString(),
        isPolling: true,
      });
    }

    const result = listCalls('', { page: 1, pageSize: 100 });
    return reply.send({
      calls: result.calls,
      total: result.total,
      timestamp: new Date().toISOString(),
      isPolling: false,
    });
  });
}
