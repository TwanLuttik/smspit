import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the pure broadcast helpers by spying the internal send
import * as ws from '../src/ws.js';
import type { TwilioMessage, TwilioCall } from '../src/types/index.js';

describe('ws broadcast helpers', () => {
  beforeEach(() => {
    // reset module state between tests is hard without export of clients, but we can still exercise
  });

  it('broadcastNewMessage / broadcastNewCall / broadcastCallUpdate / broadcastDtmf are callable without throwing', () => {
    const fakeMsg: TwilioMessage = {
      sid: 'SM' + '0'.repeat(32),
      account_sid: 'ACx',
      body: 'x',
      from: '+1',
      to: '+2',
      status: 'delivered',
      num_segments: 1,
      num_media: 0,
      error_code: null,
      error_message: null,
      direction: 'outbound-api',
      price: null,
      price_unit: null,
      messaging_service_sid: null,
      date_created: new Date().toISOString(),
      date_sent: null,
      date_updated: new Date().toISOString(),
      api_version: '2010-04-01',
      uri: '',
      subresource_uris: { media: '' },
    };

    const fakeCall: TwilioCall = {
      sid: 'CA' + '0'.repeat(32),
      account_sid: 'ACx',
      from: '+1',
      to: '+2',
      status: 'ringing',
      direction: 'outbound-api',
      duration: 0,
      start_time: new Date().toISOString(),
      end_time: null,
      price: null,
      price_unit: null,
      voice_url: null,
      voice_method: null,
      twiml: null,
      application_sid: null,
      digits: null,
      date_created: new Date().toISOString(),
      date_updated: new Date().toISOString(),
      api_version: '2010-04-01',
      uri: '',
      subresource_uris: { notifications: '', recordings: '', feedback: '' },
    };

    // These are side-effecty (no clients) but should not throw
    expect(() => ws.broadcastNewMessage(fakeMsg)).not.toThrow();
    expect(() => ws.broadcastNewCall(fakeCall)).not.toThrow();
    expect(() => ws.broadcastCallUpdate(fakeCall)).not.toThrow();
    expect(() => ws.broadcastDtmf(fakeCall, '1')).not.toThrow();
  });
});
