import type { MessageStatus } from '../types';

interface StatusBadgeProps {
  status: MessageStatus;
}

const STATUS_COLORS: Record<string, string> = {
  queued: '#f59e0b',
  sending: '#3b82f6',
  sent: '#6366f1',
  delivered: '#10b981',
  failed: '#ef4444',
  undelivered: '#f97316',
  receiving: '#8b5cf6',
  received: '#14b8a6',
  accepted: '#22c55e',
  scheduled: '#a855f7',
  canceled: '#6b7280',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] || '#6b7280';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        color: 'white',
        backgroundColor: color,
      }}
    >
      {status}
    </span>
  );
}