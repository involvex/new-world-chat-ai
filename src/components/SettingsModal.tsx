import React, { useState, useEffect } from 'react';

interface HotkeyConfig {
  showHide: string;
  generate: string;
  generateFunny: string;
  newImage: string;
  screenshot: string;
}

interface CustomPrompt {
  id: string;
  name: string;
  prompt: string;
  isDefault?: boolean;
}

interface AppConfig {
  hotkeys: HotkeyConfig;
  customPrompts: CustomPrompt[];
  selectedPrompt: string;
  startMinimized: boolean;
  showInTaskbar: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate: (config: AppConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onConfigUpdate }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'hotkeys' | 'prompts' | 'general'>('hotkeys');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', prompt: '' });

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const appConfig = await window.electronAPI.getConfig();
      setConfig(appConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    try {
      await window.electronAPI.saveConfig(config);
      onConfigUpdate(config);
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleHotkeyChange = (key: keyof HotkeyConfig, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      hotkeys: {
        ...config.hotkeys,
        [key]: value
      }
    });
  };

  const addCustomPrompt = async () => {
    if (!config || !newPrompt.name.trim() || !newPrompt.prompt.trim()) return;
    
    const prompt: CustomPrompt = {
      id: Date.now().toString(),
      name: newPrompt.name.trim(),
      prompt: newPrompt.prompt.trim(),
      isDefault: false
    };

    try {
      const updatedPrompts = await window.electronAPI.saveCustomPrompt(prompt);
      setConfig({
        ...config,
        customPrompts: updatedPrompts
      });
      setNewPrompt({ name: '', prompt: '' });
      setIsAddingPrompt(false);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  const deletePrompt = async (promptId: string) => {
    if (!config) return;
    
    try {
      const updatedPrompts = await window.electronAPI.deleteCustomPrompt(promptId);
      setConfig({
        ...config,
        customPrompts: updatedPrompts
      });
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };

  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Sidebar */}
          <div className="w-full lg:w-64 bg-gray-900 p-3 sm:p-6 border-b lg:border-b-0 lg:border-r border-gray-700">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-cyan-400">⚙️ Settings</h2>
              <button
                onClick={onClose}
                className="lg:hidden text-gray-400 hover:text-white transition-colors"
                title="Close settings"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            <nav className="flex lg:flex-col lg:space-y-2 space-x-2 lg:space-x-0 overflow-x-auto lg:overflow-x-visible">
              <button
                onClick={() => setActiveTab('hotkeys')}
                className={`flex-shrink-0 lg:w-full text-left px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                  activeTab === 'hotkeys' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                🔥 Hotkeys
              </button>
              <button
                onClick={() => setActiveTab('prompts')}
                className={`flex-shrink-0 lg:w-full text-left px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                  activeTab === 'prompts' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                💬 Prompts
              </button>
              <button
                onClick={() => setActiveTab('general')}
                className={`flex-shrink-0 lg:w-full text-left px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                  activeTab === 'general' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                🔧 General
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="hidden lg:flex justify-end p-3 sm:p-4 border-b border-gray-700">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close settings"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
            {activeTab === 'hotkeys' && (
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-200 mb-3 sm:mb-6">🔥 Hotkey Configuration</h3>
                <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">Configure global keyboard shortcuts. Changes take effect immediately.</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Show/Hide App
                      </label>
                      <input
                        type="text"
                        value={config.hotkeys.showHide}
                        onChange={(e) => handleHotkeyChange('showHide', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                        placeholder="CommandOrControl+Shift+N"
                      />
                      <p className="text-xs text-gray-500 mt-1">Toggle app visibility from anywhere</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Generate Messages
                      </label>
                      <input
                        type="text"
                        value={config.hotkeys.generate}
                        onChange={(e) => handleHotkeyChange('generate', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                        placeholder="CommandOrControl+Enter"
                      />
                      <p className="text-xs text-gray-500 mt-1">Generate chat messages when app is focused</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Generate Funny Messages
                      </label>
                      <input
                        type="text"
                        value={config.hotkeys.generateFunny}
                        onChange={(e) => handleHotkeyChange('generateFunny', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                        placeholder="CommandOrControl+Shift+Enter"
                      />
                      <p className="text-xs text-gray-500 mt-1">Generate extra funny messages</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Image
                      </label>
                      <input
                        type="text"
                        value={config.hotkeys.newImage}
                        onChange={(e) => handleHotkeyChange('newImage', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                        placeholder="CommandOrControl+N"
                      />
                      <p className="text-xs text-gray-500 mt-1">Clear current image and start over</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        📸 Take Screenshot & Generate
                      </label>
                      <input
                        type="text"
                        value={config.hotkeys.screenshot}
                        onChange={(e) => handleHotkeyChange('screenshot', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                        placeholder="CommandOrControl+Shift+S"
                      />
                      <p className="text-xs text-gray-500 mt-1">Capture screen and automatically generate messages</p>
                    </div>
                    
                    {/* New World Tip */}
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 sm:p-4 mt-4">
                      <div className="flex items-center mb-2">
                        <i className="fas fa-lightbulb text-yellow-400 mr-2"></i>
                        <span className="text-blue-300 font-medium text-sm">New World Pro Tip</span>
                      </div>
                      <p className="text-blue-200 text-xs sm:text-sm">
                        "Set your screenshot hotkey to something quick - you never know when you'll need to capture that perfect 'got ganked at windsward' moment!" 📸⚔️
                      </p>
                      <p className="text-xs text-blue-400 mt-1">- Ina Venox</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                  <h4 className="font-semibold text-blue-300 mb-2">Hotkey Format:</h4>
                  <p className="text-sm text-blue-200">
                    Use <code className="bg-blue-800 px-1 rounded">CommandOrControl</code> for Ctrl (Windows/Linux) or Cmd (Mac)<br/>
                    Combine with <code className="bg-blue-800 px-1 rounded">Shift</code>, <code className="bg-blue-800 px-1 rounded">Alt</code>, or letter keys<br/>
                    Example: <code className="bg-blue-800 px-1 rounded">CommandOrControl+Shift+A</code>
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'prompts' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-200 mb-6">Custom Prompts</h3>
                <p className="text-gray-400 mb-6">Create and manage your own AI prompts for different chat styles.</p>

                <div className="space-y-4 mb-6">
                  {config.customPrompts.map((prompt) => (
                    <div key={prompt.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-cyan-400">{prompt.name}</h4>
                          {prompt.isDefault && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Default</span>
                          )}
                          {config.selectedPrompt === prompt.id && (
                            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Active</span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setConfig({ ...config, selectedPrompt: prompt.id })}
                            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded transition-colors"
                          >
                            Use
                          </button>
                          {!prompt.isDefault && (
                            <button
                              onClick={() => deletePrompt(prompt.id)}
                              className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">{prompt.prompt}</p>
                    </div>
                  ))}
                </div>

                {!isAddingPrompt ? (
                  <button
                    onClick={() => setIsAddingPrompt(true)}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    + Add New Prompt
                  </button>
                ) : (
                  <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <h4 className="font-semibold text-gray-200 mb-4">Add New Prompt</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Prompt Name
                        </label>
                        <input
                          type="text"
                          value={newPrompt.name}
                          onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="e.g., Sarcastic Chat"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Prompt Text
                        </label>
                        <textarea
                          value={newPrompt.prompt}
                          onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 h-32 resize-none"
                          placeholder="You are a sarcastic AI assistant for New World..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={addCustomPrompt}
                          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Save Prompt
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingPrompt(false);
                            setNewPrompt({ name: '', prompt: '' });
                          }}
                          className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'general' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-200 mb-6">General Settings</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-200">Start Minimized</h4>
                      <p className="text-sm text-gray-400">Start the app minimized to system tray</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={config.startMinimized}
                        onChange={(e) => setConfig({ ...config, startMinimized: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-200">Show in Taskbar</h4>
                      <p className="text-sm text-gray-400">Display app icon in taskbar when running</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={config.showInTaskbar}
                        onChange={(e) => setConfig({ ...config, showInTaskbar: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-700">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                Save Settings
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
