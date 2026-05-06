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
  price: number | null;
  price_unit: string | null;
  messaging_service_sid: string | null;
  date_created: string;
  date_sent: string | null;
  date_updated: string;
  api_version: string;
  uri: string;
  subresource_uris: {
    media: string;
  };
}

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

export interface CreateMessageInput {
  To: string;
  From?: string;
  Body?: string;
  MediaUrl?: string;
  ContentSid?: string;
  MessagingServiceSid?: string;
  StatusCallback?: string;
  ApplicationSid?: string;
  ValidityPeriod?: number;
  ProvideFeedback?: boolean;
  SmartEncoded?: boolean;
  ContentRetention?: 'retain' | 'discard';
  AddressRetention?: 'retain' | 'obfuscate';
}

export interface MessageRow {
  id: number;
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
  price: number | null;
  price_unit: string | null;
  messaging_service_sid: string | null;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: number;
}

export interface MessageListResponse {
  messages: TwilioMessage[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    start: number;
    end: number;
    uri: string;
    first_page_uri: string;
    next_page_uri: string | null;
    previous_page_uri: string | null;
  };
}