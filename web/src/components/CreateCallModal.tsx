import { useState } from 'react';

interface CreateCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallCreated?: (callSid: string) => void;
  apiBase?: string;
}

const DEFAULT_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const DEFAULT_FROM = '+15551234567';
const DEFAULT_TO = '+15559876543';
const DEFAULT_TWIML = '<Response>\n  <Say>Hello from SMSPit virtual call!</Say>\n  <Pause length="1"/>\n  <Say>This is a test voice call.</Say>\n</Response>';

export function CreateCallModal({
  isOpen,
  onClose,
  onCallCreated,
  apiBase = 'http://localhost:4010',
}: CreateCallModalProps) {
  const [accountSid, setAccountSid] = useState(DEFAULT_ACCOUNT_SID);
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [method, setMethod] = useState<'twiml' | 'url'>('twiml');
  const [twiml, setTwiml] = useState(DEFAULT_TWIML);
  const [voiceUrl, setVoiceUrl] = useState('https://demo.twilio.com/docs/voice.xml');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const body = new URLSearchParams();
    body.append('From', from.trim());
    body.append('To', to.trim());

    if (method === 'twiml') {
      body.append('Twiml', twiml.trim());
    } else {
      body.append('Url', voiceUrl.trim());
    }

    try {
      const res = await fetch(`${apiBase}/2010-04-01/Accounts/${accountSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || 'Failed to create call';
        setError(`${msg} (code ${data.code || 'unknown'})`);
        return;
      }

      // Success! The WS broadcast will add it to the list automatically.
      onCallCreated?.(data.sid);
      handleClose(true);
    } catch (err) {
      setError('Network error — is the SMSPit server running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (wasSuccessful = false) => {
    if (!wasSuccessful) {
      // reset form only on manual close
      setError(null);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={() => handleClose()}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          margin: '20px',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>New Virtual Call</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Test voice calls directly in the browser (mocked Twilio credentials)
            </p>
          </div>
          <button
            onClick={() => handleClose()}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px' }}>
            {/* Mock Credentials */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Mock Account SID
              </label>
              <input
                type="text"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              />
            </div>

            {/* From / To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>From Number</label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="+15551234567"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--input-border)', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>To Number</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="+15559876543"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--input-border)', borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* Instruction Method */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                Call Instructions
              </label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={method === 'twiml'}
                    onChange={() => setMethod('twiml')}
                  />
                  <span style={{ fontSize: '14px' }}>Inline TwiML</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={method === 'url'}
                    onChange={() => setMethod('url')}
                  />
                  <span style={{ fontSize: '14px' }}>Voice URL</span>
                </label>
              </div>

              {method === 'twiml' ? (
                <textarea
                  value={twiml}
                  onChange={(e) => setTwiml(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--input-border)',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    resize: 'vertical',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                  required
                />
              ) : (
                <input
                  type="url"
                  value={voiceUrl}
                  onChange={(e) => setVoiceUrl(e.target.value)}
                  placeholder="https://example.com/voice.xml"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--input-border)', borderRadius: '6px' }}
                />
              )}
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginBottom: '12px',
                  border: '1px solid #fecaca',
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => handleClose()}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--input-border)',
                background: 'var(--bg-primary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !from || !to}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#6366f1',
                color: 'white',
                fontWeight: 500,
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Creating Call...' : 'Create Virtual Call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
