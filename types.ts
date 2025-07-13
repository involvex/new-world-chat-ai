
export interface ChatMessage {
  message: string;
  id?: string;
  timestamp?: number;
}

export interface ApiResponse {
  chatMessages: ChatMessage[];
}

export interface SavedMessageSet {
  id: string;
  name: string;
  timestamp: number;
  screenshotUrl?: string;
  messages: ChatMessage[];
  tags?: string[];
  isFavorite?: boolean;
}

export interface MessageHistory {
  savedSets: SavedMessageSet[];
  lastBackup?: number;
}
