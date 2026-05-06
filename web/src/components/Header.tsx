export function Header() {
  return (
    <header
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          SMSPit
        </h1>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          Twilio SMS Mock Server
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
          }}
        />
        <span style={{ fontSize: '14px', color: '#6b7280' }}>Connected</span>
      </div>
    </header>
  );
}