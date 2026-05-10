import { useState } from 'react';
import { parsePhoneNumber } from 'libphonenumber-js';
import type { TwilioCall } from '../types';
import { StatusBadge } from './StatusBadge';

interface CallListProps {
  calls: TwilioCall[];
  selectedCallSid: string | null;
  onSelectCall: (sid: string) => void;
  isLoading: boolean;
  onNewCall?: () => void;
}

function formatPhoneNumber(phone: string): string {
  try {
    const parsed = parsePhoneNumber(phone, 'US');
    if (parsed) {
      return parsed.formatNational();
    }
  } catch {}
  if (phone.length > 6) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  }
  return phone;
}

export function CallList({
  calls,
  selectedCallSid,
  onSelectCall,
  isLoading,
  onNewCall,
}: CallListProps) {
  const [search, setSearch] = useState('');

  const filteredCalls = calls.filter((call) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      call.from.toLowerCase().includes(q) ||
      call.to.toLowerCase().includes(q) ||
      call.status.toLowerCase().includes(q)
    );
  });

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

  const formatDuration = (d: number | null) => {
    if (d == null) return '';
    return `${d}s`;
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
          placeholder="Search calls..."
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
          onClick={() => onNewCall && onNewCall()}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#6366f1',
            color: 'white',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + New Call
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading && calls.length === 0 && (
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

        {filteredCalls.length === 0 && !isLoading && (
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
            <p style={{ margin: 0 }}>No calls yet</p>
            <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--text-muted)' }}>
              Click “New Call” above or use the Twilio SDK
            </p>
          </div>
        )}

        {filteredCalls.map((call) => (
          <div
            key={call.sid}
            onClick={() => onSelectCall(call.sid)}
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer',
              backgroundColor: selectedCallSid === call.sid ? 'var(--selected-bg)' : 'transparent',
              transition: 'background-color 0.1s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                ☎︎
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
                    {formatPhoneNumber(call.to)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {formatTime(call.date_created)}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  from {formatPhoneNumber(call.from)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusBadge status={call.status as any} />
                  {call.duration != null && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatDuration(call.duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
