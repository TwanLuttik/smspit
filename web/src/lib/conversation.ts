import type { TwilioMessage } from '../types';

export function conversationKey(from: string, to: string): string {
  return [from, to].sort().join('-');
}

export function conversationParties(messages: TwilioMessage[]): { local: string; remote: string } {
  const outboundFrom = new Map<string, number>();
  const inboundTo = new Map<string, number>();
  const anyFrom = new Map<string, number>();

  for (const msg of messages) {
    anyFrom.set(msg.from, (anyFrom.get(msg.from) || 0) + 1);
    if (msg.direction.startsWith('outbound')) {
      outboundFrom.set(msg.from, (outboundFrom.get(msg.from) || 0) + 1);
    } else if (msg.direction === 'inbound') {
      inboundTo.set(msg.to, (inboundTo.get(msg.to) || 0) + 1);
    }
  }

  const pickMost = (counts: Map<string, number>) => {
    let bestNum = '';
    let best = -1;
    for (const [num, n] of counts) {
      if (n > best) {
        best = n;
        bestNum = num;
      }
    }
    return bestNum;
  };

  const local =
    (outboundFrom.size ? pickMost(outboundFrom) : '') ||
    (inboundTo.size ? pickMost(inboundTo) : '') ||
    pickMost(anyFrom) ||
    messages[0]?.from ||
    '';
  const sample = messages[0];
  const remote = !sample ? '' : sample.from === local ? sample.to : sample.from;
  return { local, remote };
}

export function isFromLocal(msg: TwilioMessage, local: string): boolean {
  return msg.from === local;
}
