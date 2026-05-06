import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { MessageList } from './components/MessageList';
import { MessageDetail } from './components/MessageDetail';
import { usePolling } from './hooks/usePolling';
import './index.css';

function App() {
  const [selectedConversationKey, setSelectedConversationKey] = useState<string | null>(null);
  const { messages, isLoading, lastPoll, refresh } = usePolling(1000);

  const selectedMessages = useMemo(() => {
    if (!selectedConversationKey) return [];
    return messages.filter((msg) => {
      const key = `${msg.from}-${msg.to}`;
      return key === selectedConversationKey;
    }).sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime());
  }, [messages, selectedConversationKey]);

  const selectedPhoneNumber = useMemo(() => {
    if (!selectedConversationKey || selectedMessages.length === 0) return null;
    const msg = selectedMessages[0];
    return msg.direction === 'outbound-api' ? msg.to : msg.from;
  }, [selectedConversationKey, selectedMessages]);

  const handleSelectConversation = (key: string) => {
    setSelectedConversationKey(key);
  };

  const handleCloseDetail = () => {
    setSelectedConversationKey(null);
  };

  return (
    <div className="app">
      <Header />
      <div className="main-content">
        <div className="message-list-panel">
          <MessageList
            messages={messages}
            selectedConversationKey={selectedConversationKey}
            onSelectConversation={handleSelectConversation}
            isLoading={isLoading}
          />
        </div>
        <div className="message-detail-panel">
          <MessageDetail
            messages={selectedMessages}
            phoneNumber={selectedPhoneNumber}
            onClose={handleCloseDetail}
          />
        </div>
      </div>
      <div className="footer">
        <span>Last poll: {lastPoll ? lastPoll.toLocaleTimeString() : 'Never'}</span>
        <button onClick={refresh} className="refresh-btn">
          Refresh
        </button>
      </div>
    </div>
  );
}

export default App;