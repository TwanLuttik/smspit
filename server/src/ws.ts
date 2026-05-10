import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { TwilioMessage, TwilioCall } from './types/index.js';

const clients = new Set<WebSocket>();

function send(client: WebSocket, data: unknown) {
  if (client.readyState === 1 /* OPEN */) {
    client.send(JSON.stringify(data));
  }
}

export function broadcastNewMessage(message: TwilioMessage) {
  const payload = { type: 'new_message', data: message };
  for (const client of clients) {
    send(client, payload);
  }
}

export function broadcastNewCall(call: TwilioCall) {
  const payload = { type: 'new_call', data: call };
  for (const client of clients) {
    send(client, payload);
  }
}

export function broadcastCallUpdate(call: TwilioCall) {
  const payload = { type: 'call_updated', data: call };
  for (const client of clients) {
    send(client, payload);
  }
}

export function broadcastDtmf(call: TwilioCall, digit: string) {
  const payload = { type: 'dtmf', data: { call, digit } };
  for (const client of clients) {
    send(client, payload);
  }
}

export async function registerWebSocket(fastify: FastifyInstance): Promise<void> {
  // The plugin is registered at the top level in index.ts before this
  fastify.get('/ws', { websocket: true }, (socket, _request) => {
    clients.add(socket as unknown as WebSocket);

    socket.on('close', () => {
      clients.delete(socket as unknown as WebSocket);
    });

    socket.on('error', () => {
      clients.delete(socket as unknown as WebSocket);
    });

    // Optional: send a welcome message so client knows WS is ready
    send(socket as unknown as WebSocket, { type: 'connected', timestamp: new Date().toISOString() });
  });

  fastify.log.info('WebSocket endpoint registered at /ws');
}
