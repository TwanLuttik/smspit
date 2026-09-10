import type { CallStatus, MessageStatus } from '../types';

interface StatusBadgeProps {
  status: MessageStatus | CallStatus | string;
}

const STATUS_COLORS: Record<string, string> = {
  queued: '#ff9f0a',
  sending: '#007aff',
  sent: '#5856d6',
  delivered: '#34c759',
  failed: '#ff3b30',
  undelivered: '#ff9500',
  receiving: '#af52de',
  received: '#30d158',
  accepted: '#34c759',
  scheduled: '#af52de',
  canceled: '#8e8e93',
  initiated: '#007aff',
  ringing: '#af52de',
  'in-progress': '#5856d6',
  answered: '#34c759',
  completed: '#30d158',
  busy: '#ff9f0a',
  'no-answer': '#ff9500',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || '#8e8e93';

  return (
    <span
      className="inline-flex items-center px-1.5 rounded-full text-[11px] font-medium leading-[16px] capitalize"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
      }}
    >
      {String(status).replace('-', ' ')}
    </span>
  );
}
