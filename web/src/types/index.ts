export type MessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'delivered'
  | 'undelivered'
  | 'receiving'
  | 'received'
  | 'accepted'
  | 'scheduled'
  | 'canceled';

export type MessageDirection = 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply';

export interface TwilioMessage {
  sid: string;
  account_sid: string;
  body: string;
  from: string;
  to: string;
  status: MessageStatus;
  num_segments: number;
  num_media: number;
  error_code: number | null;
  error_message: string | null;
  direction: MessageDirection;
  content_sid?: string | null;
  content_variables?: string | null;
  media_url?: string | null;
  date_created: string;
  date_sent: string | null;
}

export type CallStatus =
  | 'queued'
  | 'initiated'
  | 'ringing'
  | 'in-progress'
  | 'answered'
  | 'completed'
  | 'busy'
  | 'failed'
  | 'no-answer'
  | 'canceled';

export type CallDirection = 'inbound' | 'outbound-api' | 'outbound-dial' | 'outbound-reply';

export interface TwilioCall {
  sid: string;
  account_sid: string;
  from: string;
  to: string;
  status: CallStatus;
  direction: CallDirection;
  duration: number | null;
  start_time: string | null;
  end_time: string | null;
  voice_url: string | null;
  twiml: string | null;
  application_sid: string | null;
  digits: string | null;
  date_created: string;
  date_updated: string;
}