import { parsePhoneNumber } from 'libphonenumber-js';
import type { TwilioMessage } from '../types';
import { StatusBadge } from './StatusBadge';

interface MessageDetailProps {
  messages: TwilioMessage[];
  phoneNumber: string | null;
  onClose: () => void;
}

function formatPhoneNumber(phone: string): string {
  try {
    const parsed = parsePhoneNumber(phone, 'US');
    if (parsed) {
      return parsed.formatNational();
    }
  } catch {
  }
  if (phone.length > 6) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function parseLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3b82f6', textDecoration: 'underline' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MessageDetail({ messages, phoneNumber, onClose }: MessageDetailProps) {
  if (!phoneNumber || messages.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
        }}
      >
        <p>Select a conversation to view messages</p>
      </div>
    );
  }

  const isSent = messages[0].direction === 'outbound-api';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#f3f4f6',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              backgroundColor: isSent ? '#10b981' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {phoneNumber.slice(-4)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {formatPhoneNumber(phoneNumber)}
            </h2>
            <span style={{ fontSize: '12px', color: isSent ? '#10b981' : '#3b82f6' }}>
              {isSent ? 'Sent' : 'Received'} · {messages.length} messages
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((msg) => {
            const isMsgSent = msg.direction === 'outbound-api';
            return (
              <div
                key={msg.sid}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMsgSent ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    backgroundColor: isMsgSent ? '#dcfce7' : '#ffffff',
                    borderRadius: '16px',
                    borderTopRightRadius: isMsgSent ? '4px' : '16px',
                    borderTopLeftRadius: isMsgSent ? '16px' : '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '15px',
                      color: '#111827',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                    }}
                  >
                    {parseLinks(msg.body)}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    paddingLeft: isMsgSent ? '0' : '8px',
                    paddingRight: isMsgSent ? '8px' : '0',
                  }}
                >
                  <StatusBadge status={msg.status} />
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {formatDate(msg.date_created)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}