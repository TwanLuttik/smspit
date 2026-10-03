import { useState } from 'react';
import { applyChannelPrefix, messageChannel, type MessageChannel } from '@/lib/channel';
import { WhatsAppMark } from './WhatsAppMark';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedConversationKey?: string | null;
  localNumber?: string | null;
  remoteNumber?: string | null;
  floating?: boolean;
}

export function SMSSimulator({
  isOpen,
  onClose,
  selectedConversationKey,
  localNumber,
  remoteNumber,
  floating,
}: Props) {
  const [from, setFrom] = useState('+15551234567');
  const [to, setTo] = useState('+15559876543');
  const [body, setBody] = useState('Hello! This is a test message from SMSPit.');
  const [channel, setChannel] = useState<MessageChannel>('sms');
  const [inbound, setInbound] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const isReplying = !!selectedConversationKey && !!localNumber && !!remoteNumber;
  const activeChannel: MessageChannel = isReplying
    ? messageChannel({ from: localNumber ?? '', to: remoteNumber ?? '' })
    : channel;
  // A reply is the other party texting back, so it is stored as inbound.
  const receive = isReplying || inbound;

  const actualFromInput = isReplying ? (remoteNumber ?? '') : from;
  const actualToInput = isReplying ? (localNumber ?? '') : to;

  const sendSMS = async () => {
    setIsSending(true);
    try {
      const actualFrom = applyChannelPrefix(actualFromInput, activeChannel);
      const actualTo = applyChannelPrefix(actualToInput, activeChannel);

      const res = receive
        ? await fetch(`${API_BASE}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              From: actualFrom,
              To: actualTo,
              Body: body,
              Channel: activeChannel,
            }),
          })
        : await fetch(`${API_BASE}/2010-04-01/Accounts/ACdemo/Messages.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              From: actualFrom,
              To: actualTo,
              Body: body,
            }).toString(),
          });

      if (res.ok) {
        setLastSent(receive ? `Received from ${actualFrom}` : `Sent to ${actualTo}`);
        setBody('');
        setTimeout(() => setLastSent(null), 2000);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to send message');
      }
    } catch {
      alert('Could not reach SMSPit server');
    } finally {
      setIsSending(false);
    }
  };

  const channelLabel = activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS';
  const actionLabel = receive ? `Receive ${channelLabel}` : `Send ${channelLabel}`;

  if (!isOpen) return null;

  const isFloating = floating !== false;

  return (
    <div className={isFloating ? "fixed right-3 bottom-3 z-[200] w-[280px] flex-shrink-0 shadow-xl border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-sidebar)] flex flex-col text-sm" : "simulator"}>
      <div className="simulator-header">
        <div className="flex items-center gap-2">
          {activeChannel === 'whatsapp' ? (
            <WhatsAppMark size={22} />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[var(--accent-sent)] flex items-center justify-center text-[11px] text-white">💬</div>
          )}
          <div>
            <div className="font-medium leading-none">{channelLabel}</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              {isReplying ? 'Reply' : receive ? 'Inbound' : 'Test send'}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="imsg-icon-btn text-[var(--text-secondary)]">×</button>
      </div>

      <div className="simulator-body space-y-3">
        {!isReplying && (
          <div className="space-y-2">
            <div className="imsg-tabs w-full">
              <button
                type="button"
                className={cn('flex-1', channel === 'sms' && 'active')}
                onClick={() => setChannel('sms')}
              >
                SMS
              </button>
              <button
                type="button"
                className={cn('flex-1 inline-flex items-center justify-center gap-1', channel === 'whatsapp' && 'active')}
                onClick={() => setChannel('whatsapp')}
              >
                <WhatsAppMark size={14} />
                WhatsApp
              </button>
            </div>
            <div className="imsg-tabs w-full">
              <button
                type="button"
                className={cn('flex-1', !inbound && 'active')}
                onClick={() => setInbound(false)}
              >
                Send
              </button>
              <button
                type="button"
                className={cn('flex-1', inbound && 'active')}
                onClick={() => setInbound(true)}
              >
                Receive
              </button>
            </div>
          </div>
        )}

        {!isReplying && (
          <>
            <div>
              <div className="text-[var(--text-secondary)] text-[11px] mb-1">From</div>
              <input value={from} onChange={e => setFrom(e.target.value)} className="input" />
            </div>
            <div>
              <div className="text-[var(--text-secondary)] text-[11px] mb-1">To</div>
              <input value={to} onChange={e => setTo(e.target.value)} className="input" />
            </div>
          </>
        )}

        {isReplying && (
          <div className="text-[12px] px-2.5 py-2 bg-[var(--bg-secondary)] rounded-xl">
            Reply as <span className="font-mono text-[var(--accent-sent)]">{actualFromInput}</span> → <span className="font-mono text-[var(--accent-sent)]">{actualToInput}</span>
          </div>
        )}

        <div>
          <div className="text-[var(--text-secondary)] text-[11px] mb-1">Message</div>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="textarea" />
        </div>

        <button
          onClick={sendSMS}
          disabled={isSending || !body.trim()}
          className="btn btn-primary w-full"
        >
          {isSending ? 'Sending…' : isReplying ? `Reply on ${channelLabel}` : actionLabel}
        </button>

        {lastSent && <div className="text-center text-[var(--accent-success)] text-[12px]">✓ {lastSent}</div>}
      </div>

      <div className="simulator-footer">Instant via WS</div>
    </div>
  );
}
