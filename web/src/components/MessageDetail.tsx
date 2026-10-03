import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, MessageCircle, X } from 'lucide-react';
import type { MessageStatus, TwilioMessage } from '../types';
import { formatPhoneNumber, formatThreadStamp } from '@/lib/format';
import { conversationParties, isFromLocal } from '@/lib/conversation';
import { messageChannel } from '@/lib/channel';
import { messageText } from '@/lib/message-text';
import { ContactAvatar } from './ContactAvatar';
import { WhatsAppMark } from './WhatsAppMark';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';
const GROUP_MS = 2 * 60 * 1000;
const STAMP_MS = 15 * 60 * 1000;

interface MessageDetailProps {
  messages: TwilioMessage[];
  phoneNumber: string | null;
  onClose: () => void;
}

function parseLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function receiptLabel(status: MessageStatus) {
  if (status === 'failed' || status === 'undelivered') return { text: 'Not Delivered', failed: true };
  if (status === 'queued' || status === 'accepted' || status === 'sending') return { text: 'Sending', failed: false };
  return { text: 'Delivered', failed: false };
}

export function MessageDetail({ messages, phoneNumber, onClose }: MessageDetailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  const endpoints = useMemo(() => {
    if (messages.length === 0) return null;
    const { local, remote } = conversationParties(messages);
    return { ours: local, theirs: remote };
  }, [messages]);

  const items = useMemo(() => {
    const local = endpoints?.ours ?? '';
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const t = new Date(msg.date_created).getTime();
      const sent = isFromLocal(msg, local);
      const sameDir = (a?: TwilioMessage) => !!a && isFromLocal(a, local) === sent;
      const close = (a?: TwilioMessage, windowMs = GROUP_MS) =>
        !!a && Math.abs(t - new Date(a.date_created).getTime()) < windowMs;

      const showStamp =
        !prev ||
        new Date(msg.date_created).toDateString() !== new Date(prev.date_created).toDateString() ||
        t - new Date(prev.date_created).getTime() > STAMP_MS;

      return {
        msg,
        sent,
        showStamp,
        groupedPrev: !showStamp && sameDir(prev) && close(prev),
        groupedNext: sameDir(next) && close(next) && (
          new Date(next.date_created).toDateString() === new Date(msg.date_created).toDateString()
        ) && (new Date(next.date_created).getTime() - t <= STAMP_MS),
      };
    });
  }, [messages, endpoints]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, phoneNumber]);

  const send = async () => {
    if (!endpoints || !draft.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/2010-04-01/Accounts/ACdemo/Messages.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          From: endpoints.ours,
          To: endpoints.theirs,
          Body: draft.trim(),
        }).toString(),
      });
      if (res.ok) {
        setDraft('');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Failed to send SMS');
      }
    } catch {
      alert('Could not reach SMSPit server');
    } finally {
      setIsSending(false);
    }
  };

  if (!phoneNumber || messages.length === 0) {
    return (
      <div className="imsg-empty">
        <div className="imsg-empty-icon">
          <MessageCircle size={26} strokeWidth={1.6} />
        </div>
        <p className="text-[17px] font-semibold text-[var(--text-primary)] m-0">Messages</p>
        <p className="text-[14px] m-0 max-w-[260px]">
          Select a conversation to read the thread.
        </p>
      </div>
    );
  }

  const last = items[items.length - 1];
  const lastReceipt = last?.sent ? receiptLabel(last.msg.status) : null;
  const isWhatsApp = messages.some((msg) => messageChannel(msg) === 'whatsapp');

  return (
    <div className="flex flex-col h-full bg-[var(--bg-thread)]">
      <div className="imsg-thread-header">
        <button
          type="button"
          onClick={onClose}
          className="imsg-icon-btn absolute right-2 top-2 text-[var(--text-secondary)]"
          aria-label="Close conversation"
        >
          <X size={16} />
        </button>
        <div className="avatar-wrap">
          <ContactAvatar phone={phoneNumber} size={40} />
          {isWhatsApp && (
            <span className="channel-badge" title="WhatsApp">
              <WhatsAppMark size={16} />
            </span>
          )}
        </div>
        <div className="text-center">
          <div className="imsg-thread-name">{formatPhoneNumber(phoneNumber)}</div>
          <div className="imsg-thread-sub">
            {isWhatsApp ? 'WhatsApp · ' : ''}
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </div>
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-auto px-3 pt-1 pb-2">
        {items.map(({ msg, sent, showStamp, groupedPrev, groupedNext }) => (
          <div key={msg.sid}>
            {showStamp && <div className="imsg-date">{formatThreadStamp(msg.date_created)}</div>}
            <div
              className={cn('flex', sent ? 'justify-end' : 'justify-start')}
              style={{ marginTop: groupedPrev ? 2 : 8 }}
              title={msg.sid}
            >
              <div
                className={cn(
                  'msg-bubble',
                  sent ? 'sent' : 'received',
                  groupedPrev && 'grouped-prev',
                  groupedNext && 'grouped-next',
                )}
              >
                {parseLinks(messageText(msg))}
                {!msg.body.trim() && msg.content_sid && (msg.content_variables || '').trim() && (
                  <div className="mt-1 text-[11px] opacity-70">Template {msg.content_sid}</div>
                )}
                {msg.media_url && (msg.body.trim() || (msg.content_variables || '').trim()) && (
                  <div className="mt-1">
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                      {msg.media_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {lastReceipt && (
          <div className={cn('flex justify-end')}>
            <div className={cn('imsg-receipt', lastReceipt.failed && 'failed')}>
              {lastReceipt.text}
            </div>
          </div>
        )}
      </div>

      <form
        className="imsg-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="imsg-compose-field">
          <textarea
            value={draft}
            rows={1}
            placeholder={isWhatsApp ? 'WhatsApp' : 'iMessage'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
        </div>
        <button
          type="submit"
          className="imsg-send"
          disabled={isSending || !draft.trim()}
          aria-label="Send"
        >
          <ArrowUp size={18} strokeWidth={2.6} />
        </button>
      </form>
    </div>
  );
}
