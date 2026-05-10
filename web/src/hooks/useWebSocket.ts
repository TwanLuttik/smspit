import { useState, useEffect, useRef, useCallback } from 'react';
import type { TwilioMessage, TwilioCall } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4010';
const WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws';

interface UseWebSocketResult {
  messages: TwilioMessage[];
  calls: TwilioCall[];
  isConnected: boolean;
  lastUpdate: Date | null;
  refresh: () => void;
  error: string | null;
}

export function useWebSocket(): UseWebSocketResult {
  const [messages, setMessages] = useState<TwilioMessage[]>([]);
  const [calls, setCalls] = useState<TwilioCall[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);

  const messagesRef = useRef<TwilioMessage[]>([]);
  const callsRef = useRef<TwilioCall[]>([]);
  messagesRef.current = messages;
  callsRef.current = calls;

  const fetchInitialData = useCallback(async () => {
    try {
      const [msgRes, callRes] = await Promise.all([
        fetch(`${API_BASE}/api/messages`),
        fetch(`${API_BASE}/api/calls`),
      ]);

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData.messages || []);
      }
      if (callRes.ok) {
        const callData = await callRes.json();
        setCalls(callData.calls || []);
      }
      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError('Failed to load initial data');
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        // Initial data load on connect
        fetchInitialData();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'new_message' && msg.data) {
            const newMsg = msg.data as TwilioMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.sid === newMsg.sid)) return prev;
              return [newMsg, ...prev];
            });
            setLastUpdate(new Date());
          }

          if (msg.type === 'new_call' && msg.data) {
            const newCall = msg.data as TwilioCall;
            setCalls((prev) => {
              if (prev.some((c) => c.sid === newCall.sid)) return prev;
              return [newCall, ...prev];
            });
            setLastUpdate(new Date());
          }

          if (msg.type === 'call_updated' && msg.data) {
            const updatedCall = msg.data as TwilioCall;
            setCalls((prev) =>
              prev.map((c) => (c.sid === updatedCall.sid ? updatedCall : c))
            );
            setLastUpdate(new Date());
          }
        } catch {
          // ignore malformed
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        setIsConnected(false);
      };
    } catch (e) {
      setError('Failed to create WebSocket');
      scheduleReconnect();
    }
  }, [fetchInitialData]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 8000);
    reconnectAttempts.current += 1;

    reconnectTimeoutRef.current = window.setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const refresh = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    messages,
    calls,
    isConnected,
    lastUpdate,
    refresh,
    error,
  };
}
