export type MessageChannel = 'sms' | 'whatsapp';

const WHATSAPP_PREFIX = /^whatsapp:/i;

export function messageChannel(msg: { from: string; to: string }): MessageChannel {
  return WHATSAPP_PREFIX.test(msg.from) || WHATSAPP_PREFIX.test(msg.to) ? 'whatsapp' : 'sms';
}

export function applyChannelPrefix(address: string, channel: MessageChannel): string {
  const stripped = address.replace(WHATSAPP_PREFIX, '');
  return channel === 'whatsapp' ? `whatsapp:${stripped}` : stripped;
}
