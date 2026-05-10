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
    <div style={{
      position: isFloating ? 'fixed' : 'relative',
      top: isFloating ? '16px' : 'auto',
      right: isFloating ? '16px' : 'auto',
      bottom: isFloating ? '16px' : 'auto',
      width: '380px',
      flexShrink: 0,
      background: 'var(--bg-primary)',
      borderRadius: isFloating ? '20px' : '0 16px 16px 0',
      boxShadow: isFloating ? '0 25px 50px -12px rgb(0 0 0 / 0.25)' : 'none',
      border: '1px solid var(--border-color)',
      borderLeft: isFloating ? undefined : 'none',
      zIndex: isFloating ? 200 : 'auto',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981, #34d399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '16px'
          }}>
            💬
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>SMS Simulator</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isReplying ? 'Replying in conversation' : 'Send test messages'}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ padding: isFloating ? '20px' : '20px 22px', flex: 1 }}>
        {!isReplying && (
          <>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>From</div>
              <input value={from} onChange={e => setFrom(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', background: 'var(--bg-secondary)', fontSize: '14px' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>To</div>
              <input value={to} onChange={e => setTo(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--input-border)', background: 'var(--bg-secondary)', fontSize: '14px' }} />
            </div>
          </>
        )}

        {isReplying && (
          <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '13px' }}>
            Replying as <strong>{replyFrom}</strong> → <strong>{replyTo}</strong>
          </div>
        )}

        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>Message</div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--input-border)', background: 'var(--bg-secondary)', fontSize: '14px', resize: 'vertical' }}
          />
        </div>

        <button
          onClick={sendSMS}
          disabled={isSending || !body.trim()}
          style={{
            width: '100%',
            padding: '13px 0',
            background: isSending ? '#475569' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          {isSending ? 'Sending...' : isReplying ? 'Send Reply' : 'Send SMS'}
        </button>

        {lastSent && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#10b981', textAlign: 'center' }}>
            ✓ {lastSent}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        Messages appear instantly via WebSocket
      </div>
    </div>
  );
}
