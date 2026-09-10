import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedConversationKey?: string | null;
  floating?: boolean;
}

export function SMSSimulator({ isOpen, onClose, selectedConversationKey, floating }: Props) {
  const [from, setFrom] = useState('+15551234567');
  const [to, setTo] = useState('+15559876543');
  const [body, setBody] = useState('Hello! This is a test message from SMSPit.');
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  // If a conversation is selected, offer to reply as the other party
  const isReplying = !!selectedConversationKey;
  let replyFrom = from;
  let replyTo = to;

  if (isReplying) {
    const [convFrom, convTo] = selectedConversationKey.split('-');
    // When replying in a conversation, we simulate the recipient replying
    replyFrom = convTo;
    replyTo = convFrom;
  }

  const sendSMS = async () => {
    setIsSending(true);
    try {
      const actualFrom = isReplying ? replyFrom : from;
      const actualTo = isReplying ? replyTo : to;

      const res = await fetch(`${API_BASE}/2010-04-01/Accounts/ACdemo/Messages.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          From: actualFrom,
          To: actualTo,
          Body: body,
        }).toString(),
      });

      if (res.ok) {
        setLastSent(`Sent to ${actualTo}`);
        setBody('');
        // Auto-clear success message
        setTimeout(() => setLastSent(null), 2000);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to send SMS');
      }
    } catch (e) {
      alert('Could not reach SMSPit server');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const isFloating = floating !== false;

  return (
    <div className={isFloating ? "fixed right-3 bottom-3 z-[200] w-[280px] flex-shrink-0 shadow-xl border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-sidebar)] flex flex-col text-sm" : "simulator"}>
      <div className="simulator-header">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--accent-sent)] flex items-center justify-center text-[11px] text-white">💬</div>
          <div>
            <div className="font-medium leading-none">SMS</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{isReplying ? 'Reply' : 'Test send'}</div>
          </div>
        </div>
        <button onClick={onClose} className="imsg-icon-btn text-[var(--text-secondary)]">×</button>
      </div>

      <div className="simulator-body space-y-3">
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
            Reply as <span className="font-mono text-[var(--accent-sent)]">{replyFrom}</span> → <span className="font-mono text-[var(--accent-sent)]">{replyTo}</span>
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
          {isSending ? 'Sending…' : isReplying ? 'Reply' : 'Send SMS'}
        </button>

        {lastSent && <div className="text-center text-[var(--accent-success)] text-[12px]">✓ {lastSent}</div>}
      </div>

      <div className="simulator-footer">Instant via WS</div>
    </div>
  );
}
