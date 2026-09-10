import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { MessageDetail } from './components/MessageDetail';
import { CallList } from './components/CallList';
import { CallDetail } from './components/CallDetail';
import { CallSimulator } from './components/CallSimulator';
import { SMSSimulator } from './components/SMSSimulator';
import { useWebSocket } from './hooks/useWebSocket';
import { conversationKey, conversationParties } from './lib/conversation';
import './index.css';

type Tab = 'messages' | 'calls';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('messages');
  const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
  const [selectedCallSid, setSelectedCallSid] = useState<string | null>(null);
  const [showCreateCall, setShowCreateCall] = useState(false);
  const [showCreateSMS, setShowCreateSMS] = useState(false);

  const { messages, calls, isConnected, lastUpdate, refresh, error } = useWebSocket();

  // Selected conversation messages (thread view)
  const selectedMessages = useMemo(() => {
    if (!selectedConversationKey) return [];
    return messages
      .filter((msg) => conversationKey(msg.from, msg.to) === selectedConversationKey)
      .sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());
  }, [messages, selectedConversationKey]);

  const selectedPhoneNumber = useMemo(() => {
    if (!selectedConversationKey || selectedMessages.length === 0) return null;
    return conversationParties(selectedMessages).remote;
  }, [selectedConversationKey, selectedMessages]);

  const selectedCall = useMemo(() => {
    return calls.find((c) => c.sid === selectedCallSid) || null;
  }, [calls, selectedCallSid]);

  const handleSelectConversation = (key: string) => {
    setSelectedConversationKey(key);
    if (activeTab !== 'messages') setActiveTab('messages');
  };

  const handleCloseMessageDetail = () => setSelectedConversationKey(null);
  const handleSelectCall = (sid: string) => setSelectedCallSid(sid);
  const handleCloseCallDetail = () => setSelectedCallSid(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'messages') setSelectedCallSid(null);
    else setSelectedConversationKey(null);
  };

  const handleRefresh = () => refresh();

  const statusText = isConnected
    ? `Live via WebSocket${lastUpdate ? ' · ' + lastUpdate.toLocaleTimeString() : ''}`
    : error
      ? `Disconnected — ${error}`
      : 'Connecting...';

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={handleTabChange} isConnected={isConnected} />

      <div className="main-content">
        {/* Left: List Panel */}
        <div className="message-list-panel">
          {activeTab === 'messages' ? (
            <MessageList
              messages={messages}
              selectedConversationKey={selectedConversationKey}
              onSelectConversation={handleSelectConversation}
              isLoading={messages.length === 0 && !lastUpdate}
              onNewSMS={() => {
                if (activeTab !== 'messages') setActiveTab('messages');
                setShowCreateSMS(true);
              }}
            />
          ) : (
            <CallList
              calls={calls}
              selectedCallSid={selectedCallSid}
              onSelectCall={handleSelectCall}
              isLoading={calls.length === 0 && !lastUpdate}
              onNewCall={() => setShowCreateCall(true)}
            />
          )}
        </div>

        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div
            className="message-detail-panel flex-1 min-w-0"
            style={{
              borderRight: (showCreateCall || showCreateSMS) ? '1px solid var(--border-color)' : 'none',
            }}
          >
            {activeTab === 'messages' ? (
              <MessageDetail
                messages={selectedMessages}
                phoneNumber={selectedPhoneNumber}
                onClose={handleCloseMessageDetail}
              />
            ) : (
              <CallDetail call={selectedCall} onClose={handleCloseCallDetail} />
            )}
          </div>

          {/* Simulator Area - only renders when open, takes its natural width */}
          {showCreateCall && (
            <CallSimulator
              isOpen={true}
              onClose={() => setShowCreateCall(false)}
              floating={false}
            />
          )}
          {showCreateSMS && (
            <SMSSimulator
              isOpen={true}
              onClose={() => setShowCreateSMS(false)}
              selectedConversationKey={selectedConversationKey}
              floating={false}
            />
          )}
        </div>
      </div>

      <div className="footer">
        <span>{statusText}</span>
        <button onClick={handleRefresh} className="refresh-btn">↻</button>
      </div>
    </div>
  );
}

export default App;