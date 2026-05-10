import { useState, useMemo } from 'react';
import { parsePhoneNumber } from 'libphonenumber-js';
import type { TwilioMessage } from '../types';

interface MessageListProps {
  messages: TwilioMessage[];
  selectedConversationKey: string | null;
  onSelectConversation: (key: string) => void;
  isLoading: boolean;
  onNewSMS?: () => void;
}

interface Conversation {
  key: string;
  phoneNumber: string;
  direction: 'sent' | 'received';
  lastMessage: TwilioMessage;
  messageCount: number;
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

export function MessageList({
  messages,
  selectedConversationKey,
  onSelectConversation,
  isLoading,
  onNewSMS,
}: MessageListProps) {
  const [search, setSearch] = useState('');

  const conversations = useMemo(() => {
    const filtered = messages.filter((msg) => {
      if (search && !msg.body.toLowerCase().includes(search.toLowerCase()) &&
          !msg.from.includes(search) && !msg.to.includes(search)) return false;
      return true;
    });

    const grouped = new Map<string, Conversation>();

    filtered.forEach((msg) => {
      const key = [msg.from, msg.to].sort().join('-');
      const existing = grouped.get(key);

      if (!existing || new Date(msg.date_created) > new Date(existing.lastMessage.date_created)) {
        grouped.set(key, {
          key,
          phoneNumber: msg.direction === 'outbound-api' ? msg.to : msg.from,
          direction: msg.direction === 'outbound-api' ? 'sent' : 'received',
          lastMessage: msg,
          messageCount: existing ? existing.messageCount + 1 : 1,
        });
      } else {
        existing.messageCount++;
      }
    });

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.lastMessage.date_created).getTime() - new Date(a.lastMessage.date_created).getTime()
    );
  }, [messages, search]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid var(--input-border)',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={() => onNewSMS?.()}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#10b981',
            color: 'white',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + New SMS
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading && messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: 'var(--text-secondary)',
            }}
          >
            Loading...
          </div>
        )}

        {conversations.length === 0 && !isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ margin: 0 }}>No messages yet</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Send an SMS using the Twilio SDK to see it here
            </p>
          </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.key}
            onClick={() => onSelectConversation(conv.key)}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer',
              backgroundColor: selectedConversationKey === conv.key ? 'var(--selected-bg)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: conv.direction === 'sent' ? 'var(--accent-sent)' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                }}
              >
                {conv.phoneNumber.slice(-4)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatPhoneNumber(conv.phoneNumber)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatTime(conv.lastMessage.date_created)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: conv.direction === 'sent' ? 'var(--accent-sent)' : 'var(--accent-received)',
                    }}
                  >
                    {conv.direction === 'sent' ? '↓ Sent' : '↑ Received'}
                  </span>
                  {conv.messageCount > 1 && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                      }}
                    >
                      {conv.messageCount} messages
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {conv.lastMessage.body}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}