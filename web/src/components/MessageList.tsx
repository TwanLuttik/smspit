import { useState, useMemo } from 'react';
import { Search, SquarePen } from 'lucide-react';
import type { TwilioMessage } from '../types';
import { formatListTime, formatPhoneNumber } from '@/lib/format';
import { conversationKey, conversationParties, isFromLocal } from '@/lib/conversation';
import { ContactAvatar } from './ContactAvatar';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: TwilioMessage[];
  selectedConversationKey: string | null;
  onSelectConversation: (key: string) => void;
  isLoading: boolean;
  onNewSMS?: () => void;
}

interface Conversation {
  key: string;
  phoneNumber: string;
  direction: 'sent' | 'received';
  lastMessage: TwilioMessage;
  messageCount: number;
}

export function MessageList({
  messages,
  selectedConversationKey,
  onSelectConversation,
  isLoading,
  onNewSMS,
}: MessageListProps) {
  const [search, setSearch] = useState('');

  const conversations = useMemo(() => {
    const filtered = messages.filter((msg) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        msg.body.toLowerCase().includes(q) ||
        msg.from.includes(search) ||
        msg.to.includes(search) ||
        formatPhoneNumber(msg.from).toLowerCase().includes(q) ||
        formatPhoneNumber(msg.to).toLowerCase().includes(q)
      );
    });

    const grouped = new Map<string, Conversation>();

    filtered.forEach((msg) => {
      const key = conversationKey(msg.from, msg.to);
      const existing = grouped.get(key);

      if (!existing || new Date(msg.date_created) > new Date(existing.lastMessage.date_created)) {
        grouped.set(key, {
          key,
          phoneNumber: existing?.phoneNumber ?? (msg.direction.startsWith('outbound') ? msg.to : msg.from),
          direction: existing?.direction ?? (msg.direction.startsWith('outbound') ? 'sent' : 'received'),
          lastMessage: msg,
          messageCount: existing ? existing.messageCount + 1 : 1,
        });
      } else {
        existing.messageCount++;
      }
    });

    for (const conv of grouped.values()) {
      const thread = filtered.filter((msg) => conversationKey(msg.from, msg.to) === conv.key);
      const { local, remote } = conversationParties(thread);
      conv.phoneNumber = remote;
      conv.direction = isFromLocal(conv.lastMessage, local) ? 'sent' : 'received';
    }

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.lastMessage.date_created).getTime() - new Date(a.lastMessage.date_created).getTime()
    );
  }, [messages, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="imsg-sidebar-title">
        <h2>Messages</h2>
        <button
          type="button"
          onClick={() => onNewSMS?.()}
          className="imsg-icon-btn"
          aria-label="New message"
          title="New message"
        >
          <SquarePen size={18} strokeWidth={2.1} />
        </button>
      </div>

      <div className="imsg-search">
        <Search size={14} strokeWidth={2.2} />
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center py-16 text-[var(--text-secondary)] text-sm">
            Loading…
          </div>
        )}

        {conversations.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-[var(--text-secondary)]">
            <p className="m-0 text-[15px] font-medium text-[var(--text-primary)]">No Messages</p>
            <p className="text-[13px] mt-1">Send via the Twilio SDK or tap compose.</p>
          </div>
        )}

        {conversations.map((conv) => {
          const previewPrefix = conv.direction === 'sent' ? 'You: ' : '';
          return (
            <div
              key={conv.key}
              onClick={() => onSelectConversation(conv.key)}
              className={cn('list-row', selectedConversationKey === conv.key && 'selected')}
            >
              <ContactAvatar phone={conv.phoneNumber} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="imsg-row-name">{formatPhoneNumber(conv.phoneNumber)}</span>
                  <span className="imsg-row-time">{formatListTime(conv.lastMessage.date_created)}</span>
                </div>
                <div className="imsg-row-preview">
                  {previewPrefix}
                  {conv.lastMessage.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
