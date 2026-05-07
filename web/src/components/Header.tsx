import { useTheme } from '../hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          SMSPit
        </h1>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          Twilio SMS Mock Server
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={toggleTheme}
          style={{
            padding: '6px',
            border: '1px solid var(--input-border)',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
            }}
          />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Connected</span>
        </div>
      </div>
    </header>
  );
}