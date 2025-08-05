import React, { useState, useEffect } from 'react';
import { webSettingsService, validateApiKey, type WebAppConfig } from '../../services/webSettingsService';

interface WebSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate: (config: WebAppConfig) => void;
  autoGenerate: boolean;
  setAutoGenerate: React.Dispatch<React.SetStateAction<boolean>>;
  customButtonLabel: string;
  setCustomButtonLabel: React.Dispatch<React.SetStateAction<string>>;
  customActionEnabled: boolean;
  setCustomActionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const WebSettingsModal: React.FC<WebSettingsModalProps> = ({
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
  const [config, setConfig] = useState<WebAppConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'prompts'>('general');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', prompt: '' });
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [apiKeyError, setApiKeyError] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadApiKey();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const appConfig = await webSettingsService.getConfig();
      setConfig(appConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadApiKey = async () => {
    try {
      const apiKey = await webSettingsService.getGeminiApiKey();
      setGeminiApiKey(apiKey);
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    setSaveStatus('saving');
    try {
      await webSettingsService.saveConfig(config);
      await webSettingsService.saveGeminiApiKey(geminiApiKey);
      onConfigUpdate(config);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const saveApiKey = async () => {
    if (!validateApiKey(geminiApiKey)) {
      setApiKeyError('Please enter a valid Gemini API key');
      return;
    }
    
    setApiKeyError('');
    setSaveStatus('saving');
    try {
      await webSettingsService.saveGeminiApiKey(geminiApiKey);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save API key:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const addCustomPrompt = async () => {
    if (!config || !newPrompt.name.trim() || !newPrompt.prompt.trim()) return;
    
    try {
      const updatedPrompts = await webSettingsService.saveCustomPrompt(newPrompt);
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
      const updatedPrompts = await webSettingsService.deleteCustomPrompt(promptId);
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
              <h2 className="text-xl sm:text-2xl font-bold text-white">Settings</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Tab Navigation */}
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'general' 
                    ? 'bg-cyan-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'api' 
                    ? 'bg-cyan-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                API Configuration
              </button>
              <button
                onClick={() => setActiveTab('prompts')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'prompts' 
                    ? 'bg-cyan-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Custom Prompts
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">General Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auto-generate" className="text-gray-300">Auto-generate on paste</label>
                    <input
                      id="auto-generate"
                      type="checkbox"
                      checked={autoGenerate}
                      onChange={(e) => setAutoGenerate(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-gray-300">Custom Button Label</label>
                    <input
                      type="text"
                      value={customButtonLabel}
                      onChange={(e) => setCustomButtonLabel(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      placeholder="Custom Action"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="custom-action-enabled" className="text-gray-300">Enable Custom Action</label>
                    <input
                      id="custom-action-enabled"
                      type="checkbox"
                      checked={customActionEnabled}
                      onChange={(e) => setCustomActionEnabled(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">API Configuration</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-gray-300">Gemini API Key</label>
                    <div className="flex space-x-2">
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => {
                          setGeminiApiKey(e.target.value);
                          setApiKeyError('');
                        }}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Enter your Gemini API key"
                      />
                      <button
                        onClick={saveApiKey}
                        disabled={saveStatus === 'saving'}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    {apiKeyError && (
                      <p className="text-red-400 text-sm">{apiKeyError}</p>
                    )}
                    {saveStatus === 'success' && (
                      <p className="text-green-400 text-sm">API key saved successfully!</p>
                    )}
                    {saveStatus === 'error' && (
                      <p className="text-red-400 text-sm">Failed to save API key</p>
                    )}
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-2">How to get your API key:</h4>
                    <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google AI Studio</a></li>
                      <li>Sign in with your Google account</li>
                      <li>Click "Create API Key"</li>
                      <li>Copy the generated key and paste it above</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'prompts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Custom Prompts</h3>
                  <button
                    onClick={() => setIsAddingPrompt(true)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                  >
                    Add Prompt
                  </button>
                </div>
                
                {isAddingPrompt && (
                  <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                    <div className="space-y-2">
                      <label className="text-gray-300">Prompt Name</label>
                      <input
                        type="text"
                        value={newPrompt.name}
                        onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Enter prompt name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-gray-300">Prompt Text</label>
                      <textarea
                        value={newPrompt.prompt}
                        onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-cyan-500 h-24 resize-none"
                        placeholder="Enter your custom prompt"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={addCustomPrompt}
                        disabled={!newPrompt.name.trim() || !newPrompt.prompt.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Save Prompt
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingPrompt(false);
                          setNewPrompt({ name: '', prompt: '' });
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {config.customPrompts?.map((prompt) => (
                    <div key={prompt.id} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{prompt.name}</h4>
                          <p className="text-gray-300 text-sm mt-1">{prompt.prompt}</p>
                        </div>
                        <button
                          onClick={() => deletePrompt(prompt.id)}
                          className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!config.customPrompts || config.customPrompts.length === 0) && (
                    <p className="text-gray-400 text-center py-8">No custom prompts yet. Click "Add Prompt" to create one.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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
            disabled={saveStatus === 'saving'}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base"
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebSettingsModal; 