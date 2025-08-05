import { useState, useEffect } from 'react';








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
  geminiApiKey?: string;
  customActionEnabled?: boolean;
  customButtonLabel?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate: (config: AppConfig) => void;
  autoGenerate: boolean;
  setAutoGenerate: React.Dispatch<React.SetStateAction<boolean>>;
  // Removed unused props
  customButtonLabel: string;
  setCustomButtonLabel: React.Dispatch<React.SetStateAction<string>>;
  customActionEnabled: boolean;
  setCustomActionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdate,
  autoGenerate,
  setAutoGenerate,
  customButtonLabel,
  setCustomButtonLabel,
  customActionEnabled,
  setCustomActionEnabled
}) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  // Hotkey recording state
  const [recordingHotkey, setRecordingHotkey] = useState<keyof HotkeyConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'hotkeys' | 'prompts' | 'general' | 'api'>('hotkeys');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', prompt: '' });
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');

  useEffect(() => {
    if (isOpen && window.electronAPI) {
      loadConfig();
      loadApiKey();
    }
    // Sync config values to parent state when config changes
    if (config) {
      if (typeof config.customActionEnabled === 'boolean') {
        setCustomActionEnabled(config.customActionEnabled);
      }
      if (typeof config.customButtonLabel === 'string') {
        setCustomButtonLabel(config.customButtonLabel);
      }
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

  const loadApiKey = async () => {
    try {
      const apiKey = await window.electronAPI.getGeminiApiKey();
      setGeminiApiKey(apiKey);
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    try {
      await window.electronAPI.saveConfig(config);
      await window.electronAPI.saveGeminiApiKey(geminiApiKey);
      onConfigUpdate(config);
      onClose();
    } catch (error) {
      console.error('Failed to save config or API key:', error);
    }
  };

  const saveApiKey = async () => {
    try {
      await window.electronAPI.saveGeminiApiKey(geminiApiKey);
      // Show success message or close modal
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  };

  const validateApiKey = (key: string): boolean => {
    // Basic validation - Gemini API keys typically start with 'AIzaSy' and are about 39 characters
    return key.length === 0 || (key.startsWith('AIzaSy') && key.length === 39);
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

  // Start recording for a specific hotkey
  const startRecordingHotkey = (key: keyof HotkeyConfig) => {
    setRecordingHotkey(key);
  };

  // Keydown event handler
  useEffect(() => {
    if (!recordingHotkey) return;
    let recording = true;
    const handleKeydown = (event: KeyboardEvent) => {
      if (!recording) return;
      event.preventDefault();
      // Build hotkey string
      const keys: string[] = [];
      if (event.ctrlKey || event.metaKey) keys.push('CommandOrControl');
      if (event.shiftKey) keys.push('Shift');
      if (event.altKey) keys.push('Alt');
      // Ignore modifier-only
      if (
        event.key === 'Control' ||
        event.key === 'Meta' ||
        event.key === 'Shift' ||
        event.key === 'Alt'
      ) {
        return;
      }
      let keyName = event.key;
      if (/^[a-zA-Z]$/.test(event.key)) {
        keyName = event.key.toUpperCase();
      }
      keys.push(keyName);
      const hotkeyString = keys.join('+');
      handleHotkeyChange(recordingHotkey, hotkeyString);
      setRecordingHotkey(null);
      recording = false;
      window.removeEventListener('keydown', handleKeydown);
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      recording = false;
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [recordingHotkey]);

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
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[98vh] flex flex-col overflow-hidden">
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
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
              <button
                onClick={() => setActiveTab('api')}
                className={`flex-shrink-0 lg:w-full text-left px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                  activeTab === 'api' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                🔑 API Key
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="hidden lg:flex justify-end p-3 sm:p-4 border-b border-gray-700">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close settings"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="flex-1 p-3 sm:p-6 overflow-y-auto min-h-0" style={{ minHeight: 0 }}>
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
                      <div className="flex items-center gap-2">
                        <span className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm select-none">
                          {config.hotkeys.showHide || 'Not set'}
                        </span>
                        <button
                          className="px-2 py-1 bg-cyan-700 text-white rounded hover:bg-cyan-800 text-xs"
                          onClick={() => startRecordingHotkey('showHide')}
                        >Change</button>
                        {recordingHotkey === 'showHide' && (
                          <span className="ml-2 text-yellow-400 text-xs">Press any key combination...</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Toggle app visibility from anywhere</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Generate Messages
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm select-none">
                          {config.hotkeys.generate || 'Not set'}
                        </span>
                        <button
                          className="px-2 py-1 bg-cyan-700 text-white rounded hover:bg-cyan-800 text-xs"
                          onClick={() => startRecordingHotkey('generate')}
                        >Change</button>
                        {recordingHotkey === 'generate' && (
                          <span className="ml-2 text-yellow-400 text-xs">Press any key combination...</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Generate chat messages when app is focused</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Generate Funny Messages
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm select-none">
                          {config.hotkeys.generateFunny || 'Not set'}
                        </span>
                        <button
                          className="px-2 py-1 bg-cyan-700 text-white rounded hover:bg-cyan-800 text-xs"
                          onClick={() => startRecordingHotkey('generateFunny')}
                        >Change</button>
                        {recordingHotkey === 'generateFunny' && (
                          <span className="ml-2 text-yellow-400 text-xs">Press any key combination...</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Generate extra funny messages</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Image
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm select-none">
                          {config.hotkeys.newImage || 'Not set'}
                        </span>
                        <button
                          className="px-2 py-1 bg-cyan-700 text-white rounded hover:bg-cyan-800 text-xs"
                          onClick={() => startRecordingHotkey('newImage')}
                        >Change</button>
                        {recordingHotkey === 'newImage' && (
                          <span className="ml-2 text-yellow-400 text-xs">Press any key combination...</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Clear current image and start over</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        📸 Take Screenshot & Generate
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm select-none">
                          {config.hotkeys.screenshot || 'Not set'}
                        </span>
                        <button
                          className="px-2 py-1 bg-cyan-700 text-white rounded hover:bg-cyan-800 text-xs"
                          onClick={() => startRecordingHotkey('screenshot')}
                        >Change</button>
                        {recordingHotkey === 'screenshot' && (
                          <span className="ml-2 text-yellow-400 text-xs">Press any key combination...</span>
                        )}
                      </div>
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
                      <h4 className="font-semibold text-gray-200">Auto-generate on Paste</h4>
                      <p className="text-sm text-gray-400">Automatically generate chat messages when you paste an image</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoGenerate}
                        onChange={e => setAutoGenerate(e.target.checked)}
                        aria-label="Toggle auto-generation on paste"
                        title="Enable or disable auto-generation when pasting images"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-200">Enable Custom Action Button</h4>
                      <p className="text-sm text-gray-400">Show a custom action button for your selected prompt</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!customActionEnabled}
                        onChange={e => {
                          setCustomActionEnabled(e.target.checked);
                          setConfig({ ...config, customActionEnabled: e.target.checked });
                        }}
                        aria-label="Toggle custom action button"
                        title="Enable or disable custom action button"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-200">Custom Button Label</h4>
                      <p className="text-sm text-gray-400">Change the label of the custom action button</p>
                    </div>
                    <input
                      type="text"
                      value={customButtonLabel}
                      onChange={e => {
                        setCustomButtonLabel(e.target.value);
                        setConfig({ ...config, customButtonLabel: e.target.value });
                      }}
                      className="bg-gray-800 text-gray-200 border border-gray-600 rounded px-2 py-1 w-full sm:w-48"
                      placeholder="Custom Action"
                      aria-label="Custom button label"
                      title="Change the label of the custom action button"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-200">Start Minimized</h4>
                      <p className="text-sm text-gray-400">Start the app minimized to system tray</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="start-minimized-checkbox"
                        type="checkbox"
                        className="sr-only peer"
                        checked={config.startMinimized}
                        onChange={(e) => setConfig({ ...config, startMinimized: e.target.checked })}
                        title="Start Minimized"
                        placeholder="Start Minimized"
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
                        id="show-in-taskbar-checkbox"
                        type="checkbox"
                        className="sr-only peer"
                        checked={config.showInTaskbar}
                        onChange={(e) => setConfig({ ...config, showInTaskbar: e.target.checked })}
                        title="Show in Taskbar"
                        aria-label="Show in Taskbar"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                      <label htmlFor="show-in-taskbar-checkbox" className="sr-only">
                        Show in Taskbar
                      </label>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div>
                <h3 className="text-2xl font-bold text-gray-200 mb-6">🔑 API Configuration</h3>
                
                <div className="space-y-6">
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-400 text-lg">💡</div>
                      <div>
                        <h4 className="font-semibold text-blue-300 mb-2">About API Keys</h4>
                        <p className="text-blue-200 text-sm mb-2">
                          This app uses Google's Gemini AI to generate chat messages. You can optionally provide your own API key for unlimited usage.
                        </p>
                        <p className="text-blue-200 text-sm">
                          <strong>Leave empty to use the default key</strong> (shared with rate limits) or get your own free key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-100">Google AI Studio</a>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="gemini-api-key" className="block text-sm font-semibold text-gray-200 mb-2">
                      Gemini API Key (Optional)
                    </label>
                    <div className="relative">
                      <input
                        id="gemini-api-key"
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Leave empty to use default key, or paste your API key here..."
                        className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                          geminiApiKey && !validateApiKey(geminiApiKey) 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-600'
                        }`}
                      />
                      {geminiApiKey && !validateApiKey(geminiApiKey) && (
                        <div className="absolute right-2 top-2 text-red-400">
                          <i className="fas fa-exclamation-triangle"></i>
                        </div>
                      )}
                    </div>
                    {geminiApiKey && !validateApiKey(geminiApiKey) && (
                      <p className="text-red-400 text-xs mt-1">
                        Invalid API key format. Should start with 'AIzaSy' and be 39 characters long.
                      </p>
                    )}
                    {geminiApiKey && validateApiKey(geminiApiKey) && (
                      <p className="text-green-400 text-xs mt-1">
                        ✓ Valid API key format
                      </p>
                    )}
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-yellow-400 text-lg">⚠️</div>
                      <div>
                        <h4 className="font-semibold text-yellow-300 mb-2">Security Notice</h4>
                        <ul className="text-yellow-200 text-sm space-y-1">
                          <li>• Your API key is stored locally and never shared</li>
                          <li>• Only you have access to your personal API key</li>
                          <li>• You can remove it at any time by clearing this field</li>
                          <li>• Get a free API key with generous quota at Google AI Studio</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={saveApiKey}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Save API Key
                  </button>
                </div>
              </div>
            )}

            {/* Sticky Footer */}
            <div className="sticky bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-10 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 pb-4 px-3 sm:px-6">
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
