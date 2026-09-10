import { useEffect, useState } from 'react';
import { Phone, X } from 'lucide-react';
import type { TwilioCall } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatPhoneNumber } from '@/lib/format';
import { ContactAvatar } from './ContactAvatar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';

interface CallDetailProps {
  call: TwilioCall | null;
  onClose: () => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CallDetail({ call, onClose }: CallDetailProps) {
  const [isHangingUp, setIsHangingUp] = useState(false);
  const [liveDuration, setLiveDuration] = useState<number | null>(null);

  const isActive = call && ['ringing', 'in-progress', 'answered'].includes(call.status);

  useEffect(() => {
    if (!isActive || !call?.start_time) {
      setLiveDuration(null);
      return;
    }

    const start = new Date(call.start_time).getTime();
    const tick = () => setLiveDuration(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
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
    } catch {
      alert('Network error while hanging up');
    } finally {
      setIsHangingUp(false);
    }
  };

  if (!call) {
    return (
      <div className="imsg-empty">
        <div className="imsg-empty-icon">
          <Phone size={24} strokeWidth={1.6} />
        </div>
        <p className="text-[17px] font-semibold text-[var(--text-primary)] m-0">Calls</p>
        <p className="text-[14px] m-0">Select a call to view details.</p>
      </div>
    );
  }

  const displayDuration = isActive && liveDuration !== null ? liveDuration : call.duration;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-thread)]">
      <div className="imsg-thread-header">
        <button
          type="button"
          onClick={onClose}
          className="imsg-icon-btn absolute right-2 top-2 text-[var(--text-secondary)]"
          aria-label="Close call"
        >
          <X size={16} />
        </button>
        <ContactAvatar phone={call.to} size={40} />
        <div className="text-center">
          <div className="imsg-thread-name">{formatPhoneNumber(call.to)}</div>
          <div className="imsg-thread-sub">from {formatPhoneNumber(call.from)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <StatusBadge status={call.status} />
          {isActive && (
            <span className="text-[11px] font-semibold text-[var(--accent-success)] tracking-wide">
              LIVE
            </span>
          )}
        </div>
        {isActive && (
          <button
            onClick={() => handleHangUp('completed')}
            disabled={isHangingUp}
            className="px-3 py-1 text-[12px] rounded-full bg-[var(--accent-danger)] text-white font-semibold disabled:opacity-60"
          >
            {isHangingUp ? '…' : 'Hang Up'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 text-sm">
        {isActive && displayDuration !== null && (
          <div className="mb-5 text-center">
            <div className="text-[var(--text-secondary)] text-[11px] font-medium tracking-wide">
              DURATION
            </div>
            <div className="text-[40px] font-semibold tabular-nums text-[var(--accent-success)] tracking-tight leading-none mt-1">
              {Math.floor(displayDuration / 60)}:{(displayDuration % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}

        <div className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-[13px]">
          <div className="text-[var(--text-secondary)]">Status</div>
          <div><StatusBadge status={call.status} /></div>

          <div className="text-[var(--text-secondary)]">Duration</div>
          <div className="tabular-nums">{displayDuration != null ? `${displayDuration}s` : '—'}</div>

          <div className="text-[var(--text-secondary)]">Direction</div>
          <div className="capitalize">{call.direction.replace('-', ' ')}</div>

          <div className="text-[var(--text-secondary)]">Started</div>
          <div>{formatDate(call.start_time)}</div>

          {call.end_time && (
            <>
              <div className="text-[var(--text-secondary)]">Ended</div>
              <div>{formatDate(call.end_time)}</div>
            </>
          )}

          <div className="text-[var(--text-secondary)]">SID</div>
          <div className="font-mono text-[11px] break-all text-[var(--text-secondary)]">{call.sid}</div>

          {call.voice_url && (
            <>
              <div className="text-[var(--text-secondary)] pt-px">Voice URL</div>
              <a
                href={call.voice_url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-sent)] break-all"
              >
                {call.voice_url}
              </a>
            </>
          )}

          {call.twiml && (
            <>
              <div className="text-[var(--text-secondary)] pt-0.5">TwiML</div>
              <pre className="text-[11px] p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl whitespace-pre-wrap font-mono text-[var(--text-secondary)]">
                {call.twiml}
              </pre>
            </>
          )}
        </div>
      </div>

      {isActive && (
        <div className="px-4 py-2 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-color)]">
          Simulated call — use Hang Up or the API to terminate.
        </div>
      )}
    </div>
  );
}
