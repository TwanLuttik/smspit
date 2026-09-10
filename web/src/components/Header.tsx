import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '@/lib/utils';

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
    <header className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-header)] px-3 py-2 text-sm gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="m-0 text-[17px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] leading-none">
            SMSPit
          </h1>
          <p className="m-0 mt-0.5 text-[11px] text-[var(--text-secondary)]">Twilio dev environment</p>
        </div>

        {showTabs && (
          <div className="imsg-tabs">
            <button
              onClick={() => onTabChange('messages')}
              className={cn(activeTab === 'messages' && 'active')}
            >
              Messages
            </button>
            <button
              onClick={() => onTabChange('calls')}
              className={cn(activeTab === 'calls' && 'active')}
            >
              Calls
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="imsg-icon-btn"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <div className="flex items-center gap-1.5 pr-1">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              isConnected ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-warning)]',
            )}
          />
          <span className="text-[12px] text-[var(--text-secondary)]">
            {isConnected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
      </div>
    </header>
  );
}
