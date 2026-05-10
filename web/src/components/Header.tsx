import { useTheme } from '../hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

type Tab = 'messages' | 'calls';

interface HeaderProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  isConnected?: boolean;
}

export function Header({ activeTab = 'messages', onTabChange, isConnected = true }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const showTabs = !!onTabChange;

  return (
    <header
      style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-primary)',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)' }}>
            SMSPit
          </h1>
          <p style={{ margin: '1px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Twilio development environment
          </p>
        </div>

        {showTabs && (
          <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '3px' }}>
            <button
              onClick={() => onTabChange('messages')}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'messages' ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === 'messages' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: activeTab === 'messages' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Messages
            </button>
            <button
              onClick={() => onTabChange('calls')}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'calls' ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === 'calls' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: activeTab === 'calls' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Calls
            </button>
          </div>
        )}
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
              backgroundColor: isConnected ? '#10b981' : '#f59e0b',
            }}
          />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {isConnected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
      </div>
    </header>
  );
}