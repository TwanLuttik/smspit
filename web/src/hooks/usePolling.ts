import { useState, useEffect, useRef, useCallback } from 'react';
import type { TwilioMessage } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';

interface UsePollingResult {
  messages: TwilioMessage[];
  isLoading: boolean;
  error: string | null;
  lastPoll: Date | null;
  refresh: () => void;
}

export function usePolling(pollInterval = 1000): UsePollingResult {
  const [messages, setMessages] = useState<TwilioMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const lastPollRef = useRef<Date | null>(null);
  const fetchingRef = useRef(false);

  const fetchMessages = useCallback(async (isPolling = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const url = lastPollRef.current && isPolling
        ? `${API_BASE}/api/messages?lastPoll=${encodeURIComponent(lastPollRef.current.toISOString())}`
        : `${API_BASE}/api/messages`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();

      if (isPolling && lastPollRef.current) {
        setMessages((prev) => {
          const existingSids = new Set(prev.map((m) => m.sid));
          const newMessages = (data.messages || []).filter((m: TwilioMessage) => !existingSids.has(m.sid));
          if (newMessages.length === 0) return prev;
          return [...prev, ...newMessages];
        });
      } else {
        setMessages(data.messages || []);
      }

      lastPollRef.current = new Date();
      setLastPoll(lastPollRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const refresh = useCallback(() => {
    lastPollRef.current = null;
    fetchMessages(false);
  }, [fetchMessages]);

  useEffect(() => {
    fetchMessages(false);

    const interval = setInterval(() => {
      fetchMessages(true);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchMessages, pollInterval]);

  return { messages, isLoading, error, lastPoll, refresh };
}