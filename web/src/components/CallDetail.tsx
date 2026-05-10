import { useState, useEffect } from 'react';
import { parsePhoneNumber } from 'libphonenumber-js';
import type { TwilioCall } from '../types';
import { StatusBadge } from './StatusBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';

interface CallDetailProps {
  call: TwilioCall | null;
  onClose: () => void;
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

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
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

export function CallDetail({ call, onClose }: CallDetailProps) {
  const [isHangingUp, setIsHangingUp] = useState(false);
  const [liveDuration, setLiveDuration] = useState<number | null>(null);

  const isActive = call && ['ringing', 'in-progress', 'answered'].includes(call.status);

  // Live ticking duration for active calls
  useEffect(() => {
    if (!isActive || !call?.start_time) {
      setLiveDuration(null);
      return;
    }

    const start = new Date(call.start_time).getTime();

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - start) / 1000);
      setLiveDuration(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [call?.sid, isActive, call?.start_time]);

  const handleHangUp = async (reason: 'completed' | 'busy' | 'no-answer' = 'completed') => {
    if (!call) return;

    setIsHangingUp(true);
    try {
      const res = await fetch(
        `${API_BASE}/2010-04-01/Accounts/${call.account_sid}/Calls/${call.sid}.json`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `Status=${reason}`,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to hang up: ${err.message || res.statusText}`);
      }
      // WS will push the updated call automatically
    } catch (e) {
      alert('Network error while hanging up');
    } finally {
      setIsHangingUp(false);
    }
  };

  if (!call) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>☎︎</div>
          <p>Select a call to view details</p>
        </div>
      </div>
    );
  }

  const displayDuration = isActive && liveDuration !== null ? liveDuration : call.duration;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-tertiary)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '9999px',
              background: isActive ? '#22c55e' : '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '22px',
              boxShadow: isActive ? '0 0 0 4px rgba(34, 197, 94, 0.2)' : 'none',
            }}
          >
            ☎
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
              {formatPhoneNumber(call.to)}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              from {formatPhoneNumber(call.from)}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          ×
        </button>
      </div>

      {/* Status + Actions */}
      <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StatusBadge status={call.status as any} />
            {isActive && (
              <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>LIVE</span>
            )}
          </div>

          {isActive && (
            <button
              onClick={() => handleHangUp('completed')}
              disabled={isHangingUp}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: 600,
                fontSize: '13px',
                cursor: isHangingUp ? 'wait' : 'pointer',
              }}
            >
              {isHangingUp ? 'Hanging up...' : 'Hang Up'}
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* Live Duration */}
        {isActive && displayDuration !== null && (
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Duration</div>
            <div style={{ fontSize: '42px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#22c55e' }}>
              {Math.floor(displayDuration / 60)}:{(displayDuration % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px 18px', fontSize: '14px' }}>
          <div style={{ color: 'var(--text-secondary)', paddingTop: '3px' }}>Status</div>
          <div><StatusBadge status={call.status as any} /></div>

          <div style={{ color: 'var(--text-secondary)', paddingTop: '3px' }}>Duration</div>
          <div>{displayDuration != null ? `${displayDuration}s` : '—'}</div>

          <div style={{ color: 'var(--text-secondary)', paddingTop: '3px' }}>Direction</div>
          <div style={{ textTransform: 'capitalize' }}>{call.direction.replace('-', ' ')}</div>

          <div style={{ color: 'var(--text-secondary)', paddingTop: '3px' }}>Started</div>
          <div>{formatDate(call.start_time)}</div>

          {call.end_time && (
            <>
              <div style={{ color: 'var(--text-secondary)', paddingTop: '3px' }}>Ended</div>
              <div>{formatDate(call.end_time)}</div>
            </>
          )}

          <div style={{ color: 'var(--text-secondary)', paddingTop: '3px' }}>Call SID</div>
          <div style={{ fontFamily: 'monospace', fontSize: '12.5px', wordBreak: 'break-all' }}>{call.sid}</div>

          {call.voice_url && (
            <>
              <div style={{ color: 'var(--text-secondary)', paddingTop: '4px' }}>Voice URL</div>
              <a href={call.voice_url} target="_blank" rel="noreferrer" style={{ color: '#6366f1', wordBreak: 'break-all' }}>
                {call.voice_url}
              </a>
            </>
          )}

          {call.twiml && (
            <>
              <div style={{ color: 'var(--text-secondary)', paddingTop: '6px' }}>TwiML</div>
              <pre style={{
                margin: 0,
                padding: '10px',
                background: 'var(--bg-primary)',
                borderRadius: '6px',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--border-color)'
              }}>
                {call.twiml}
              </pre>
            </>
          )}
        </div>
      </div>

      {/* Footer hint for active calls */}
      {isActive && (
        <div style={{ padding: '12px 20px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
          This call is simulated. Use the Hang Up button or call the update API to end it.
        </div>
      )}
    </div>
  );
}
