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
  content_sid: string | null;
  content_variables: string | null;
  media_url: string | null;
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
  ContentVariables?: string;
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
  content_sid: string | null;
  content_variables: string | null;
  media_url: string | null;
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
  price: number | null;
  price_unit: string | null;
  voice_url: string | null;
  voice_method: string | null;
  twiml: string | null;
  application_sid: string | null;
  digits: string | null;           // accumulated DTMF digits pressed during the call
  date_created: string;
  date_updated: string;
  api_version: string;
  uri: string;
  subresource_uris: {
    notifications: string;
    recordings: string;
    feedback: string;
  };
}

export interface CreateCallInput {
  To: string;
  From: string;
  Url?: string;
  Twiml?: string;
  ApplicationSid?: string;
  Method?: string;
  FallbackUrl?: string;
  FallbackMethod?: string;
  StatusCallback?: string;
  StatusCallbackMethod?: string;
  StatusCallbackEvent?: string;
  SendDigits?: string;
  Timeout?: number;
  Record?: boolean;
  RecordingChannels?: string;
  RecordingStatusCallback?: string;
  MachineDetection?: string;
  MachineDetectionTimeout?: number;
  SipAuthUsername?: string;
  SipAuthPassword?: string;
}

export interface CallRow {
  id: number;
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
  voice_method: string | null;
  twiml: string | null;
  application_sid: string | null;
  price: number | null;
  price_unit: string | null;
  digits: string | null;
  created_at: string;
  updated_at: string;
}