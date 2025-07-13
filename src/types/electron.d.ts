interface ElectronAPI {
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  
  // Configuration management
  getConfig: () => Promise<AppConfig>;
  saveConfig: (config: Partial<AppConfig>) => Promise<AppConfig>;
  
  // Custom prompts management
  getCustomPrompts: () => Promise<CustomPrompt[]>;
  saveCustomPrompt: (prompt: CustomPrompt) => Promise<CustomPrompt[]>;
  deleteCustomPrompt: (promptId: string) => Promise<CustomPrompt[]>;
  
  // Message history management
  getMessageHistory: () => Promise<MessageHistory>;
  saveMessageSet: (messageSet: SavedMessageSet) => Promise<MessageHistory>;
  deleteMessageSet: (setId: string) => Promise<MessageHistory>;
  exportMessages: (messageSet: SavedMessageSet) => Promise<{ success: boolean; filePath?: string; error?: string; cancelled?: boolean }>;
  shareMessages: (messageSet: SavedMessageSet, shareType: 'clipboard' | 'discord') => Promise<{ success: boolean; type?: string; error?: string }>;
  backupMessageHistory: () => Promise<{ success: boolean; filePath?: string; error?: string; cancelled?: boolean }>;
  
  // Screenshot functionality
  takeScreenshot: () => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
  
  // Auto-paste to New World
  pasteToNewWorld: (message: string) => Promise<{ success: boolean; error?: string }>;
  
  // Utility methods
  invoke: (channel: string, data?: any) => Promise<any>;
  platform: string;
  versions: any;
}

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

interface SavedMessageSet {
  id: string;
  name: string;
  timestamp: number;
  screenshotUrl?: string;
  messages: ChatMessage[];
  tags?: string[];
  isFavorite?: boolean;
}

interface MessageHistory {
  savedSets: SavedMessageSet[];
  lastBackup?: number;
}

interface ChatMessage {
  message: string;
  id?: string;
  timestamp?: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
