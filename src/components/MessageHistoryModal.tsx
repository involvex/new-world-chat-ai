import React, { useState, useEffect, useCallback, memo } from 'react';
import type { SavedMessageSet, MessageHistory } from '../../types';

interface MessageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadMessageSet: (messageSet: SavedMessageSet) => void;
}

const MessageHistoryModal = memo<MessageHistoryModalProps>(({ isOpen, onClose, onLoadMessageSet }) => {
  const [messageHistory, setMessageHistory] = useState<MessageHistory>({ savedSets: [] });
  const [selectedSet, setSelectedSet] = useState<SavedMessageSet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load message history when modal opens
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      loadMessageHistory();
    }
  }, [isOpen]);

  const loadMessageHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const history = await window.electronAPI.getMessageHistory();
      setMessageHistory(history);
    } catch (error) {
      console.error('Failed to load message history:', error);
      showNotification('Failed to load message history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleDeleteSet = useCallback(async (setId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.electronAPI) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this message set?');
    if (!confirmed) return;

    try {
      const updatedHistory = await window.electronAPI.deleteMessageSet(setId);
      setMessageHistory(updatedHistory);
      showNotification('Message set deleted successfully');
      
      if (selectedSet?.id === setId) {
        setSelectedSet(null);
      }
    } catch (error) {
      console.error('Failed to delete message set:', error);
      showNotification('Failed to delete message set');
    }
  }, [selectedSet, showNotification]);

  const handleExportSet = useCallback(async (messageSet: SavedMessageSet, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.exportMessages(messageSet);
      if (result.success) {
        showNotification('Messages exported successfully!');
      } else if (result.cancelled) {
        // User cancelled, no notification needed
      } else {
        showNotification(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to export messages:', error);
      showNotification('Failed to export messages');
    }
  }, [showNotification]);

  const handleShareSet = useCallback(async (messageSet: SavedMessageSet, shareType: 'clipboard' | 'discord', event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.shareMessages(messageSet, shareType);
      if (result.success) {
        const platform = shareType === 'discord' ? 'Discord' : 'clipboard';
        showNotification(`Messages copied to ${platform}!`);
      } else {
        showNotification(`Share failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to share messages:', error);
      showNotification('Failed to share messages');
    }
  }, [showNotification]);

  const handleLoadSet = useCallback((messageSet: SavedMessageSet) => {
    onLoadMessageSet(messageSet);
    onClose();
  }, [onLoadMessageSet, onClose]);

  const handleBackup = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.backupMessageHistory();
      if (result.success) {
        showNotification('Message history backed up successfully!');
      } else if (result.cancelled) {
        // User cancelled, no notification needed
      } else {
        showNotification(`Backup failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to backup message history:', error);
      showNotification('Failed to backup message history');
    }
  }, [showNotification]);

  // Filter and sort message sets
  const filteredAndSortedSets = messageHistory.savedSets
    .filter(set => {
      const nameMatch = typeof set.name === 'string' && set.name.toLowerCase().includes(searchTerm.toLowerCase());
      const messageMatch = Array.isArray(set.messages) && set.messages.some(msg =>
        typeof msg.message === 'string' && msg.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return nameMatch || messageMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] sm:h-[85vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-cyan-400">💾 Saved Messages</h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              {messageHistory.savedSets.length} saved message sets
            </p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleBackup}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-xs sm:text-sm touch-manipulation"
              title="Backup all message history"
            >
              📦 Backup
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-xl sm:text-2xl font-bold touch-manipulation"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-3 sm:p-4 border-b border-gray-700/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search saved messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            title="Sort saved messages"
            aria-label="Sort saved messages"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* List Panel */}
          <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading saved messages...</p>
              </div>
            ) : filteredAndSortedSets.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                {searchTerm ? 'No messages match your search.' : 'No saved messages yet.'}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filteredAndSortedSets.map((messageSet) => (
                  <div
                    key={messageSet.id}
                    onClick={() => setSelectedSet(messageSet)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                      selectedSet?.id === messageSet.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white truncate flex-1 mr-2">
                        {messageSet.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        {messageSet.isFavorite && (
                          <span className="text-yellow-400" title="Favorite">⭐</span>
                        )}
                        <button
                          onClick={(e) => handleExportSet(messageSet, e)}
                          className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Export messages"
                        >
                          📤
                        </button>
                        <button
                          onClick={(e) => handleShareSet(messageSet, 'clipboard', e)}
                          className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => handleShareSet(messageSet, 'discord', e)}
                          className="p-1 text-gray-400 hover:text-purple-400 transition-colors"
                          title="Copy for Discord"
                        >
                          💬
                        </button>
                        <button
                          onClick={(e) => handleDeleteSet(messageSet.id, e)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete message set"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {new Date(messageSet.timestamp).toLocaleString()} • {messageSet.messages.length} messages
                    </p>
                    <p className="text-sm text-gray-300 truncate">
                      {messageSet.messages[0]?.message || 'No messages'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 overflow-y-auto">
            {selectedSet ? (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">{selectedSet.name}</h3>
                  <p className="text-sm text-gray-400">
                    Generated: {new Date(selectedSet.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400">
                    {selectedSet.messages.length} messages
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {selectedSet.messages.map((message, index) => (
                    <div key={`${selectedSet.id}-${index}`} className="p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-start justify-between">
                        <span className="text-sm text-gray-400 mr-2">{index + 1}.</span>
                        <p className="text-white flex-1 font-mono text-sm">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleLoadSet(selectedSet)}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors font-semibold"
                  >
                    🔄 Continue from Here
                  </button>
                  <button
                    onClick={(e) => handleExportSet(selectedSet, e)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    📤 Export
                  </button>
                  <button
                    onClick={(e) => handleShareSet(selectedSet, 'clipboard', e)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={(e) => handleShareSet(selectedSet, 'discord', e)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
                  >
                    💬 Discord
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-4">👆</div>
                <p>Select a message set to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="absolute top-4 right-4 bg-cyan-600 text-white px-4 py-2 rounded-lg shadow-lg">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
});

MessageHistoryModal.displayName = 'MessageHistoryModal';

export default MessageHistoryModal;
