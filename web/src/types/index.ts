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
  date_created: string;
  date_sent: string | null;
}