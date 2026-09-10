import { useState } from 'react';
import { Phone, Search } from 'lucide-react';
import type { TwilioCall } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatListTime, formatPhoneNumber } from '@/lib/format';
import { ContactAvatar } from './ContactAvatar';
import { cn } from '@/lib/utils';

interface CallListProps {
  calls: TwilioCall[];
  selectedCallSid: string | null;
  onSelectCall: (sid: string) => void;
  isLoading: boolean;
  onNewCall?: () => void;
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
      formatPhoneNumber(call.from).toLowerCase().includes(q) ||
      formatPhoneNumber(call.to).toLowerCase().includes(q) ||
      call.status.toLowerCase().includes(q)
    );
  });

  const formatDuration = (d: number | null) => {
    if (d == null) return '';
    const m = Math.floor(d / 60);
    const s = d % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="imsg-sidebar-title">
        <h2>Calls</h2>
        <button
          type="button"
          onClick={() => onNewCall?.()}
          className="imsg-icon-btn"
          aria-label="New call"
          title="New call"
        >
          <Phone size={17} strokeWidth={2.1} />
        </button>
      </div>

      <div className="imsg-search">
        <Search size={14} strokeWidth={2.2} />
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && calls.length === 0 && (
          <div className="flex items-center justify-center py-16 text-[var(--text-secondary)] text-sm">
            Loading…
          </div>
        )}

        {filteredCalls.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-[var(--text-secondary)]">
            <p className="m-0 text-[15px] font-medium text-[var(--text-primary)]">No Calls</p>
            <p className="text-[13px] mt-1">Start a simulated call or use the Twilio SDK.</p>
          </div>
        )}

        {filteredCalls.map((call) => (
          <div
            key={call.sid}
            onClick={() => onSelectCall(call.sid)}
            className={cn('list-row', selectedCallSid === call.sid && 'selected')}
          >
            <ContactAvatar phone={call.to} size={44} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="imsg-row-name">{formatPhoneNumber(call.to)}</span>
                <span className="imsg-row-time">{formatListTime(call.date_created)}</span>
              </div>
              <div className="imsg-row-preview flex items-center gap-1.5">
                <span>from {formatPhoneNumber(call.from)}</span>
                {call.duration != null && <span>· {formatDuration(call.duration)}</span>}
              </div>
              <div className="mt-0.5">
                <StatusBadge status={call.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
