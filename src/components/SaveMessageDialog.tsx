import React, { useState, useCallback, memo } from 'react';
import type { SavedMessageSet, ChatMessage } from '../../types';

interface SaveMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  screenshotUrl?: string;
  onSave: (messageSet: SavedMessageSet) => void;
}

const SaveMessageDialog = memo<SaveMessageDialogProps>(({ 
  isOpen, 
  onClose, 
  messages, 
  screenshotUrl, 
  onSave 
}) => {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      alert('Please enter a name for this message set.');
      return;
    }

    if (!window.electronAPI) {
      alert('Save functionality is not available.');
      return;
    }

    setIsLoading(true);

    try {
      const messageSet: SavedMessageSet = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        timestamp: Date.now(),
        screenshotUrl,
        messages: messages.map((msg, index) => ({
          ...msg,
          id: msg.id || `${Date.now()}-${index}`,
          timestamp: msg.timestamp || Date.now()
        })),
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
        isFavorite
      };

      await window.electronAPI.saveMessageSet(messageSet);
      onSave(messageSet);
      
      // Reset form
      setName('');
      setTags('');
      setIsFavorite(false);
      onClose();
    } catch (error) {
      console.error('Failed to save message set:', error);
      alert('Failed to save messages. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [name, tags, isFavorite, messages, screenshotUrl, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSave, onClose]);

  // Generate default name based on current time
  const generateDefaultName = useCallback(() => {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    setName(`Messages ${timestamp}`);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-cyan-400">💾 Save Messages</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-xl"
              aria-label="Close dialog"
              disabled={isLoading}
            >
              ×
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Save {messages.length} generated messages for later use
          </p>
        </div>

        {/* Form */}
        <div className="p-6" onKeyDown={handleKeyDown}>
          <div className="space-y-4">
            {/* Name field */}
            <div>
              <label htmlFor="message-set-name" className="block text-sm font-medium text-gray-300 mb-2">
                Name *
              </label>
              <div className="flex space-x-2">
                <input
                  id="message-set-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name for this message set..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  maxLength={100}
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  onClick={generateDefaultName}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                  title="Generate default name"
                  disabled={isLoading}
                  type="button"
                >
                  🎲
                </button>
              </div>
            </div>

            {/* Tags field */}
            <div>
              <label htmlFor="message-set-tags" className="block text-sm font-medium text-gray-300 mb-2">
                Tags (optional)
              </label>
              <input
                id="message-set-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="funny, pvp, dungeon... (comma separated)"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Add tags to help organize and find your saved messages later
              </p>
            </div>

            {/* Favorite checkbox */}
            <div className="flex items-center">
              <input
                id="message-set-favorite"
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                disabled={isLoading}
              />
              <label htmlFor="message-set-favorite" className="ml-2 text-sm text-gray-300">
                ⭐ Mark as favorite
              </label>
            </div>

            {/* Preview */}
            <div className="border-t border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-300 mb-2">Preview Messages</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {messages.slice(0, 3).map((message, index) => (
                  <div key={index} className="text-xs text-gray-400 bg-gray-700/50 p-2 rounded">
                    {index + 1}. {message.message.length > 80 
                      ? `${message.message.substring(0, 80)}...` 
                      : message.message}
                  </div>
                ))}
                {messages.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    ... and {messages.length - 3} more messages
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isLoading}
            className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Saving...
              </span>
            ) : (
              '💾 Save Messages'
            )}
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500 text-center">
            <kbd className="px-1 py-0.5 bg-gray-700 rounded">Ctrl+Enter</kbd> to save • 
            <kbd className="px-1 py-0.5 bg-gray-700 rounded ml-1">Esc</kbd> to cancel
          </p>
        </div>
      </div>
    </div>
  );
});

SaveMessageDialog.displayName = 'SaveMessageDialog';

export default SaveMessageDialog;
