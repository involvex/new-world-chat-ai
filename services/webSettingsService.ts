// Web-compatible settings service for browser environment
export interface WebAppConfig {
  hotkeys?: {
    screenshot?: string;
    generate?: string;
    funnier?: string;
    newImage?: string;
  };
  customPrompts?: Array<{
    id: string;
    name: string;
    prompt: string;
    isDefault?: boolean;
  }>;
  customActionEnabled?: boolean;
  customButtonLabel?: string;
  selectedPrompt?: string;
}

class WebSettingsService {
  private readonly CONFIG_KEY = 'new-world-chat-config';
  private readonly API_KEY_KEY = 'new-world-chat-api-key';

  // Get stored API key
  async getGeminiApiKey(): Promise<string> {
    try {
      return localStorage.getItem(this.API_KEY_KEY) || '';
    } catch (error) {
      console.error('Failed to get API key from localStorage:', error);
      return '';
    }
  }

  // Save API key
  async saveGeminiApiKey(apiKey: string): Promise<void> {
    try {
      localStorage.setItem(this.API_KEY_KEY, apiKey);
    } catch (error) {
      console.error('Failed to save API key to localStorage:', error);
      throw error;
    }
  }

  // Get stored config
  async getConfig(): Promise<WebAppConfig> {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return this.getDefaultConfig();
    } catch (error) {
      console.error('Failed to get config from localStorage:', error);
      return this.getDefaultConfig();
    }
  }

  // Save config
  async saveConfig(config: WebAppConfig): Promise<void> {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save config to localStorage:', error);
      throw error;
    }
  }

  // Save custom prompt
  async saveCustomPrompt(prompt: { name: string; prompt: string }): Promise<Array<{ id: string; name: string; prompt: string; isDefault?: boolean }>> {
    try {
      const config = await this.getConfig();
      const newPrompt = {
        id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: prompt.name,
        prompt: prompt.prompt,
        isDefault: false
      };
      
      const updatedPrompts = [...(config.customPrompts || []), newPrompt];
      await this.saveConfig({ ...config, customPrompts: updatedPrompts });
      return updatedPrompts;
    } catch (error) {
      console.error('Failed to save custom prompt:', error);
      throw error;
    }
  }

  // Delete custom prompt
  async deleteCustomPrompt(promptId: string): Promise<Array<{ id: string; name: string; prompt: string; isDefault?: boolean }>> {
    try {
      const config = await this.getConfig();
      const updatedPrompts = (config.customPrompts || []).filter(p => p.id !== promptId);
      await this.saveConfig({ ...config, customPrompts: updatedPrompts });
      return updatedPrompts;
    } catch (error) {
      console.error('Failed to delete custom prompt:', error);
      throw error;
    }
  }

  // Get default config
  private getDefaultConfig(): WebAppConfig {
    return {
      hotkeys: {
        screenshot: 'Ctrl+Alt+S',
        generate: 'Ctrl+Alt+G',
        funnier: 'Ctrl+Alt+F',
        newImage: 'Ctrl+Alt+N'
      },
      customPrompts: [],
      customActionEnabled: true,
      customButtonLabel: 'Custom Action',
      selectedPrompt: ''
    };
  }
}

// Create singleton instance
export const webSettingsService = new WebSettingsService();

// Web-compatible API key validation
export const validateApiKey = (apiKey: string): boolean => {
  return apiKey.length > 0 && apiKey.startsWith('AIzaSy') && apiKey.length === 39;
}; 