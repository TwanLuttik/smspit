import { useState } from 'react';
import type { TwilioCall } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';
const KEYPAD = ['1','2','3','4','5','6','7','8','9','*','0','#'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  floating?: boolean; // true = fixed overlay, false = inline in layout
}

export function CallSimulator({ isOpen, onClose, floating }: Props) {
  const [call, setCall] = useState<TwilioCall | null>(null);
  const [phase, setPhase] = useState<'idle' | 'ringing' | 'answered'>('idle');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [digits, setDigits] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [from, setFrom] = useState('+15551234567');
  const [to, setTo] = useState('+15559876543');
  const [twiml, setTwiml] = useState('<Response><Say>Hello. Press 1 for sales, 2 for support.</Say></Response>');

  const log = (msg: string) => setTranscript(t => [...t, msg]);

  const startCall = async () => {
    setIsCreating(true);
    try {
      const body = new URLSearchParams({ From: from, To: to, Twiml: twiml });
      const res = await fetch(`${API_BASE}/2010-04-01/Accounts/ACdemo/Calls.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const data = await res.json();
      if (res.ok) {
        setCall(data);
        setPhase('ringing');
        log('📞 Ringing...');
        setTimeout(() => {
          setPhase('answered');
          log('✅ Answered');
          speakTwiML(twiml);
        }, 1400);
      } else {
        alert(data.message || 'Failed to create call');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const speakTwiML = (twimlStr: string) => {
    if (!('speechSynthesis' in window)) return;
    const matches = twimlStr.match(/<Say[^>]*>(.*?)<\/Say>/gi) || [];
    const text = matches.map(m => m.replace(/<[^>]+>/g, '').trim()).join('. ');
    if (!text) return;

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.93;
    window.speechSynthesis.speak(u);
    log(`🗣️ "${text}"`);
  };

  const pressKey = async (d: string) => {
    if (!call || phase !== 'answered') return;
    const newD = digits + d;
    setDigits(newD);
    log(`🔢 Pressed ${d}`);

    try {
      await fetch(`${API_BASE}/2010-04-01/Accounts/${call.account_sid}/Calls/${call.sid}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `Digits=${d}`
      });
    } catch {}
  };

  const hangUp = async () => {
    if (call) {
      try {
        await fetch(`${API_BASE}/2010-04-01/Accounts/${call.account_sid}/Calls/${call.sid}.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'Status=completed'
        });
      } catch {}
    }
    onClose();
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
      height: isFloating ? 'auto' : '100%',
      background: 'var(--bg-primary)',
      borderRadius: isFloating ? '20px' : '0 16px 16px 0',
      boxShadow: isFloating ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' : 'none',
      border: '1px solid var(--border-color)',
      borderLeft: isFloating ? '1px solid var(--border-color)' : 'none',
      zIndex: isFloating ? 200 : 'auto',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* ChatGPT-style Header */}
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
            width: '32px', height: '32px', borderRadius: '9999px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '15px'
          }}>
            ☎︎
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Call Simulator</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Virtual Twilio Voice</div>
          </div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>×</button>
      </div>

      {/* Pre-call Form - ChatGPT style */}
      {!call && (
        <div style={{ padding: isFloating ? '22px 20px' : '20px 22px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>From Number</div>
            <input
              value={from}
              onChange={e => setFrom(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--input-border)', background: 'var(--bg-secondary)', fontSize: '14.5px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>To Number</div>
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--input-border)', background: 'var(--bg-secondary)', fontSize: '14.5px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>Voice Script</div>
            <textarea
              value={twiml}
              onChange={e => setTwiml(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--input-border)',
                background: 'var(--bg-secondary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            onClick={startCall}
            disabled={isCreating}
            style={{
              width: '100%',
              padding: '13px 0',
              background: isCreating ? '#475569' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            {isCreating ? 'Connecting...' : 'Start Call'}
          </button>
        </div>
      )}

      {/* Active Simulator */}
      {call && (
        <>
          <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{to}</div>
              <div style={{ fontSize: '11px', padding: '1px 9px', borderRadius: '999px', background: phase === 'answered' ? '#166534' : '#854d0e', color: phase === 'answered' ? '#4ade80' : '#fde047' }}>
                {phase.toUpperCase()}
              </div>
            </div>
            {digits && <div style={{ marginTop: '6px', fontSize: '17px', fontFamily: 'monospace', color: '#6366f1' }}>{digits}</div>}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px', fontSize: '12.5px', background: 'var(--bg-tertiary)' }}>
            {transcript.length === 0 && <div style={{ color: 'var(--text-muted)' }}>Transcript...</div>}
            {transcript.map((l, i) => <div key={i} style={{ marginBottom: '3px' }}>{l}</div>)}
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginBottom: '10px' }}>
              {KEYPAD.map(d => (
                <button key={d} onClick={() => pressKey(d)} disabled={phase !== 'answered'}
                  style={{ height: '46px', fontSize: '18px', borderRadius: '8px', background: phase === 'answered' ? 'var(--bg-secondary)' : '#f1f5f9', border: '1px solid var(--border-color)' }}>
                  {d}
                </button>
              ))}
            </div>
            <button onClick={hangUp} style={{ width: '100%', padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700 }}>
              END CALL
            </button>
          </div>
        </>
      )}
    </div>
  );
}
