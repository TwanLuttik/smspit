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
    <div className={isFloating ? "fixed right-3 bottom-3 z-[200] w-[280px] flex-shrink-0 shadow-xl border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-sidebar)] flex flex-col text-sm" : "simulator h-full"}>
      <div className="simulator-header">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--accent-sent)] flex items-center justify-center text-[11px] text-white">☎︎</div>
          <div>
            <div className="font-medium leading-none">Call</div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">Virtual voice</div>
          </div>
        </div>
        <button onClick={onClose} className="imsg-icon-btn text-[var(--text-secondary)]">×</button>
      </div>

      {!call && (
        <div className="simulator-body space-y-3">
          <div>
            <div className="text-[var(--text-secondary)] text-[11px] mb-1">From</div>
            <input value={from} onChange={e => setFrom(e.target.value)} className="input" />
          </div>
          <div>
            <div className="text-[var(--text-secondary)] text-[11px] mb-1">To</div>
            <input value={to} onChange={e => setTo(e.target.value)} className="input" />
          </div>
          <div>
            <div className="text-[var(--text-secondary)] text-[11px] mb-1">TwiML / Script</div>
            <textarea value={twiml} onChange={e => setTwiml(e.target.value)} rows={3} className="textarea text-[12px] font-mono" />
          </div>
          <button onClick={startCall} disabled={isCreating} className="btn btn-primary w-full">
            {isCreating ? 'Connecting…' : 'Start Call'}
          </button>
        </div>
      )}

      {call && (
        <>
          <div className="px-3 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="font-medium tabular-nums">{to}</div>
            <div className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${phase === 'answered' ? 'text-[var(--accent-success)] bg-[color-mix(in_srgb,var(--accent-success)_16%,transparent)]' : 'text-[var(--accent-warning)] bg-[color-mix(in_srgb,var(--accent-warning)_16%,transparent)]'}`}>{phase}</div>
          </div>

          <div className="flex-1 overflow-auto p-3 bg-[var(--bg-secondary)] text-[12px] font-mono text-[var(--text-secondary)] space-y-0.5">
            {transcript.length === 0 && <div className="text-[var(--text-muted)]">Transcript…</div>}
            {transcript.map((l, i) => <div key={i}>{l}</div>)}
            {digits && <div className="text-[var(--accent-sent)] pt-1">DTMF: {digits}</div>}
          </div>

          <div className="p-2.5 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)]">
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {KEYPAD.map(d => (
                <button key={d} onClick={() => pressKey(d)} disabled={phase !== 'answered'}
                  className="h-8 text-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-full disabled:opacity-40 active:bg-[var(--bg-tertiary)]">
                  {d}
                </button>
              ))}
            </div>
            <button onClick={hangUp} className="w-full h-8 text-sm bg-[var(--accent-danger)] text-white rounded-full font-semibold">End Call</button>
          </div>
        </>
      )}
    </div>
  );
}
