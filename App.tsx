import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { generateChatResponses } from './services/geminiService';
import type { ApiResponse, ChatMessage, SavedMessageSet } from './types';
import SettingsModal from './src/components/SettingsModal';
import MessageHistoryModal from './src/components/MessageHistoryModal';
import SaveMessageDialog from './src/components/SaveMessageDialog';
import AboutModal from './src/components/AboutModal';



// --- Helper UI Components (memoized for performance) ---

const Header = memo<{ 
  onOpenSettings: () => void; 
  onOpenHistory: () => void; 
  onTakeScreenshot: () => void;
  onCloseApp?: () => void;
}>(({ onOpenSettings, onOpenHistory, onTakeScreenshot, onCloseApp }) => (
  <header className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 shadow-lg">
    {/* Background decoration */}
    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
    
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-3">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-6">
        {/* Left side - Title and description */}
        <div className="flex-1 text-center lg:text-left space-y-2">
          {/* Main title with enhanced styling */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent tracking-wide">
              New World Chat AI
            </h1>
            <div className="h-0.5 w-20 sm:w-24 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full mx-auto lg:mx-0"></div>
          </div>
          
          {/* Description */}
          <p className="text-gray-300 text-sm lg:text-base max-w-2xl leading-relaxed">
            Upload or paste a game screenshot to generate contextual chat messages with AI-powered humor.
          </p>
          
          {/* Keyboard shortcuts section */}
          <div className="space-y-2">
            {/* Main tip */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 text-cyan-300">
              <span className="text-lg">💡</span>
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-700/80 border border-gray-600 rounded shadow-sm">Ctrl+V</kbd>
              <span className="text-xs sm:text-sm">to paste and auto-generate!</span>
            </div>
            
            {/* Detailed shortcuts */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50">
                <kbd className="px-1 py-0.5 font-mono bg-gray-700 text-gray-200 rounded text-xs">Ctrl+Enter</kbd>
                <span>Generate</span>
              </div>
              <span className="hidden sm:inline text-gray-600">•</span>
              <div className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50">
                <kbd className="px-1 py-0.5 font-mono bg-purple-700 text-purple-100 rounded text-xs">Ctrl+Shift+Enter</kbd>
                <span>Funny</span>
              </div>
              <span className="hidden sm:inline text-gray-600">•</span>
              <div className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50">
                <kbd className="px-1 py-0.5 font-mono bg-blue-700 text-blue-100 rounded text-xs">Ctrl+Shift+S</kbd>
                <span>Screenshot</span>
              </div>
              <span className="hidden sm:inline text-gray-600">•</span>
              <div className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50">
                <kbd className="px-1 py-0.5 font-mono bg-red-700 text-red-100 rounded text-xs">Esc</kbd>
                <span>Clear</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="group relative p-2 text-gray-400 hover:text-cyan-400 transition-all duration-300 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-cyan-500/50 hover:shadow-md hover:shadow-cyan-500/10 touch-manipulation"
            title="Message History"
          >
            <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
          </button>
          <button
            onClick={onTakeScreenshot}
            className="group relative p-2 text-gray-400 hover:text-cyan-400 transition-all duration-300 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-cyan-500/50 hover:shadow-md hover:shadow-cyan-500/10 touch-manipulation"
            title="Take Screenshot (Ctrl+Shift+S)"
          >
            <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
          </button>
          {/* Hide settings button in web version */}
          {window.electronAPI && (
            <>
              <button
                onClick={onOpenSettings}
                className="group relative p-2 text-gray-400 hover:text-cyan-400 transition-all duration-300 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-cyan-500/50 hover:shadow-md hover:shadow-cyan-500/10 touch-manipulation"
                title="Settings"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
              </button>
              {onCloseApp && (
                <button
                  onClick={onCloseApp}
                  className="group relative p-2 text-gray-400 hover:text-red-400 transition-all duration-300 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 hover:border-red-500/50 hover:shadow-md hover:shadow-red-500/10 touch-manipulation"
                  title="Close Application"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    
    {/* Bottom gradient line */}
    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
  </header>
));
Header.displayName = 'Header';

const Loader = memo(() => (
  <div className="flex flex-col items-center justify-center space-y-4 my-8">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-300 absolute inset-0 animation-delay-150"></div>
    </div>
    <p className="text-cyan-400 animate-pulse">Analyzing screenshot and crafting responses...</p>
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce animation-delay-75"></div>
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce animation-delay-150"></div>
    </div>
  </div>
));
Loader.displayName = 'Loader';

// Notification Component
interface NotificationProps {
  message: string;
  onClose: () => void;
}

const Notification = memo<NotificationProps>(({ message, onClose }) => (
  <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-cyan-900/90 border border-cyan-500 text-cyan-100 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-bounce max-w-sm sm:max-w-none mx-auto sm:mx-0">
    <div className="flex items-center space-x-2">
      <span className="text-sm sm:text-base break-words">{message}</span>
      <button
        onClick={onClose}
        className="text-cyan-300 hover:text-cyan-100 text-lg flex-shrink-0 touch-manipulation"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  </div>
));
Notification.displayName = 'Notification';

interface ResponseCardProps {
  chatMessage: ChatMessage;
  onPasteToNewWorld?: (message: string) => void;
}


const ResponseCard = memo<ResponseCardProps>(({ chatMessage, onPasteToNewWorld }) => {
  const [copied, setCopied] = useState(false);
  const [pasting, setPasting] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(chatMessage.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [chatMessage.message]);

  const handlePasteToGame = useCallback(async () => {
    if (onPasteToNewWorld) {
      setPasting(true);
      try {
        await onPasteToNewWorld(chatMessage.message);
      } finally {
        setPasting(false);
      }
    }
  }, [chatMessage.message, onPasteToNewWorld]);

  // Memoize icons to prevent re-creation
  const ClipboardIcon = useMemo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ), []);

  const CheckIcon = useMemo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ), []);

  const GameIcon = useMemo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V8a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ), []);

  const buttonClassName = useMemo(() => 
    `p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
      copied 
        ? 'bg-green-500 text-white focus:ring-green-400' 
        : 'bg-gray-600 text-gray-300 hover:bg-cyan-500 hover:text-white focus:ring-cyan-400'
    }`, [copied]);

  const pasteButtonClassName = useMemo(() => 
    `p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
      pasting 
        ? 'bg-blue-500 text-white focus:ring-blue-400 animate-pulse' 
        : 'bg-gray-600 text-gray-300 hover:bg-blue-500 hover:text-white focus:ring-blue-400'
    }`, [pasting]);

  return (
    <div className="bg-gray-800 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-lg transition-all duration-300 hover:bg-gray-700 hover:shadow-cyan-500/10 gap-3 sm:gap-4">
      <p className="text-sm sm:text-base lg:text-lg font-mono text-gray-200 flex-1 break-words overflow-wrap-anywhere">{chatMessage.message}</p>
      <div className="flex space-x-2 flex-shrink-0 self-end sm:self-center">
        <button
          onClick={handleCopy}
          className={buttonClassName}
          aria-label="Copy message"
          title="Copy to clipboard"
        >
          {copied ? CheckIcon : ClipboardIcon}
        </button>
        {onPasteToNewWorld && (
          <button
            onClick={handlePasteToGame}
            className={pasteButtonClassName}
            aria-label="Paste to New World"
            title="Auto-paste to New World chat"
            disabled={pasting}
          >
            {GameIcon}
          </button>
        )}
      </div>
    </div>
  );
});
ResponseCard.displayName = 'ResponseCard';

// --- Error Boundary Component ---
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-8 rounded-lg text-center max-w-md">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            <p className="mb-4">The application encountered an unexpected error.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-500"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Main Application Component ---

function App() {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<ApiResponse | null>(null);
  const [isFunnier, setIsFunnier] = useState<boolean>(false);
  const [autoGenerate, setAutoGenerate] = useState<boolean>(() => {
    const saved = localStorage.getItem('autoGenerate');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    const saved = localStorage.getItem('showWelcome');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showMessageHistory, setShowMessageHistory] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  // App config state managed in SettingsModal
  const [currentMessageSet, setCurrentMessageSet] = useState<SavedMessageSet | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [customPrompts, setCustomPrompts] = useState<any[]>([]);
  const [selectedCustomPrompt, setSelectedCustomPrompt] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('autoGenerate', JSON.stringify(autoGenerate));
  }, [autoGenerate]);

  useEffect(() => {
    localStorage.setItem('showWelcome', JSON.stringify(showWelcome));
  }, [showWelcome]);

  // Load app configuration on mount
  useEffect(() => {
    if (window.electronAPI) {
      // Load custom prompts and configuration
      Promise.all([
        window.electronAPI.getCustomPrompts(),
        window.electronAPI.getConfig()
      ]).then(([prompts, config]) => {
        setCustomPrompts(prompts);
        // Set the last selected prompt
        if (config.selectedPrompt) {
          setSelectedCustomPrompt(config.selectedPrompt);
        }
      }).catch((error) => {
        console.error('Failed to load app configuration:', error);
      });
    }
  }, []);

  // Listen for electron hotkey events
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.receive('hotkey-generate', () => {
        if (screenshotUrl && !isLoading) {
          handleGeneration();
        }
      });

      window.electronAPI.receive('hotkey-generate-funny', () => {
        if (screenshotUrl && !isLoading) {
          handleGeneration(true);
        }
      });

      window.electronAPI.receive('hotkey-new-image', () => {
        if (screenshotUrl) {
          resetSelection();
        }
      });

      // Listen for tray settings event
      window.electronAPI.receive('open-settings-from-tray', () => {
        setShowSettings(true);
      });

      // Listen for tray about event
      window.electronAPI.receive('open-about-from-tray', () => {
        setShowAbout(true);
      });
    }
  }, [screenshotUrl, isLoading]);

  const processImageFile = useCallback(async (file: File | null, shouldAutoGenerate: boolean = false) => {
    console.log('processImageFile called with:', file?.name, file?.size, 'shouldAutoGenerate:', shouldAutoGenerate);
    
    if (!file) {
      console.log('No file provided to processImageFile');
      return;
    }
    
    // Clean up old URL if it exists
    if (screenshotUrl) {
      console.log('Cleaning up old screenshot URL');
      URL.revokeObjectURL(screenshotUrl);
    }
    
    // Convert file directly to data URL instead of using blob URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
    
    console.log('Created data URL directly from file:', dataUrl.substring(0, 50) + '...');
    setScreenshotUrl(dataUrl);

    // Reset app state for a new image
    setResponses(null);
    setError(null);
    setIsLoading(false);
    setIsFunnier(false);
    setShowWelcome(false);

    console.log('Auto-generate enabled:', autoGenerate, 'Should auto-generate:', shouldAutoGenerate);

    // Show notification for auto-generation
    if (shouldAutoGenerate && autoGenerate) {
      setNotification("📸 Screenshot pasted! Auto-generating chat messages...");
      console.log('Starting auto-generation after delay...');
      // Small delay to let the UI update
      setTimeout(() => {
        console.log('Triggering auto-generation...');
        handleGeneration();
        setNotification(null);
      }, 1000);
    } else if (shouldAutoGenerate && !autoGenerate) {
      setNotification("📸 Screenshot pasted! Click 'Generate Chat Messages' to continue.");
      setTimeout(() => setNotification(null), 3000);
    }
  }, [screenshotUrl, autoGenerate]);

  // Effect to handle pasting images from clipboard
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.includes('image')) {
          const file = item.getAsFile();
          // Auto-generate when pasting
          processImageFile(file, true);
          return; // Handle first image found
        }
      }
    };

    // Drag and drop handlers
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.includes('image')) {
          processImageFile(file, true); // Auto-generate on drop
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [processImageFile]); // Move keyboard shortcuts to separate useEffect after function declarations

  // Effect to clean up the object URL on component unmount
  useEffect(() => {
    return () => {
      if (screenshotUrl) {
        URL.revokeObjectURL(screenshotUrl);
      }
    };
  }, [screenshotUrl]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    processImageFile(event.target.files?.[0] ?? null, false); // Don't auto-generate for manual uploads
  }, [processImageFile]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  const resetSelection = useCallback(() => {
    setScreenshotUrl(null); // This will trigger the cleanup effect for the old URL
    setResponses(null);
    setError(null);
    setIsFunnier(false);
    setCurrentMessageSet(null); // Clear current message set when resetting
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }, []);

  const handleSaveMessages = useCallback(() => {
    if (!responses || responses.chatMessages.length === 0) {
      setNotification("No messages to save!");
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setShowSaveDialog(true);
  }, [responses]);

  const handleMessageSetSaved = useCallback((messageSet: SavedMessageSet) => {
    setCurrentMessageSet(messageSet);
    setSaveNotification(`💾 Saved "${messageSet.name}" successfully!`);
    setTimeout(() => setSaveNotification(null), 4000);
  }, []);

  const handleLoadMessageSet = useCallback((messageSet: SavedMessageSet) => {
    // Load the message set and make it the current context
    setCurrentMessageSet(messageSet);
    
    // If there's a screenshot URL, load it
    if (messageSet.screenshotUrl) {
      setScreenshotUrl(messageSet.screenshotUrl);
    }
    
    // Set the responses to the saved messages
    setResponses({
      chatMessages: messageSet.messages
    });
    
    // Clear any errors and reset other state
    setError(null);
    setIsLoading(false);
    setIsFunnier(false);
    setShowWelcome(false);
    
    // Show notification
    setNotification(`📥 Loaded "${messageSet.name}" - continue generating from here!`);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleContinueFromSaved = useCallback(async (makeItFunnier: boolean = false) => {
    if (!currentMessageSet) {
      setError("No saved message set to continue from.");
      return;
    }

    // Use the screenshot from the saved set if available, otherwise require current screenshot
    const imageUrl = currentMessageSet.screenshotUrl || screenshotUrl;
    if (!imageUrl) {
      setError("No screenshot available to continue generation. Please upload a new screenshot.");
      return;
    }
    
    const funninessLevel = makeItFunnier || isFunnier;
    if (makeItFunnier) {
      setIsFunnier(true);
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await generateChatResponses(imageUrl, funninessLevel);
      
      // Merge new messages with existing ones
      const combinedMessages = [...responses!.chatMessages, ...result.chatMessages];
      setResponses({ chatMessages: combinedMessages });
      
      // Update current message set with new messages
      const updatedMessageSet = {
        ...currentMessageSet,
        messages: combinedMessages,
        timestamp: Date.now() // Update timestamp
      };
      
      // Auto-save the updated message set
      if (window.electronAPI) {
        await window.electronAPI.saveMessageSet(updatedMessageSet);
        setCurrentMessageSet(updatedMessageSet);
      }
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentMessageSet, screenshotUrl, isFunnier, responses]);

  const handleGeneration = useCallback(async (makeItFunnier: boolean = false, imageUrl?: string, customPromptId?: string) => {
    // If we have a current message set, continue from it
    if (currentMessageSet && responses) {
      return handleContinueFromSaved(makeItFunnier);
    }

    const imageToUse = imageUrl || screenshotUrl;
    if (!imageToUse) {
      setError("Please select or paste a screenshot first.");
      return;
    }
    
    const funninessLevel = makeItFunnier || isFunnier;
    if (makeItFunnier) {
      setIsFunnier(true);
    }

    setIsLoading(true);
    setError(null);
    setResponses(null); // Clear previous responses before fetching new ones
    try {
      // Get custom prompt if provided
      let customPrompt = '';
      if (customPromptId && window.electronAPI) {
        const prompts = await window.electronAPI.getCustomPrompts();
        const prompt = prompts.find(p => p.id === customPromptId);
        customPrompt = prompt?.prompt || '';
      }
      
      const result = await generateChatResponses(imageToUse, funninessLevel, customPrompt);
      setResponses(result);
      // Clear current message set when generating new messages
      setCurrentMessageSet(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [screenshotUrl, isFunnier, currentMessageSet, responses, handleContinueFromSaved]);

  const handlePasteToNewWorld = useCallback(async (message: string) => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.pasteToNewWorld(message);
        if (result.success) {
          setNotification("🎮 Message pasted to New World chat!");
          setTimeout(() => setNotification(null), 3000);
        } else {
          setError(`Auto-paste failed: ${result.error}`);
        }
      } catch (error) {
        setError('Failed to paste to New World: ' + (error instanceof Error ? error.message : String(error)));
      }
    } else {
      setError("Auto-paste is only available in the desktop app");
    }
  }, []);

  const handleTakeScreenshot = useCallback(async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.takeScreenshot();
        if (result.success && result.dataUrl) {
          fetch(result.dataUrl)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], 'screenshot.png', { type: 'image/png' });
              processImageFile(file, true); // Auto-generate on screenshot
            });
        } else {
          setError(`Screenshot failed: ${result.error}`);
        }
      } catch (error) {
        setError('Failed to take screenshot');
      }
    } else {
      // Web version - show instruction for manual screenshot
      setError("Web version: Please take a screenshot manually (Print Screen) and paste it with Ctrl+V");
    }
  }, [processImageFile]);

  const handleCloseApp = useCallback(async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.quitApp();
      } catch (error) {
        console.error('Failed to close app:', error);
      }
    }
  }, []);

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to generate
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (screenshotUrl && !isLoading) {
          handleGeneration();
        }
      }
      // Ctrl/Cmd + Shift + Enter to generate funny
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        if (screenshotUrl && !isLoading) {
          handleGeneration(true);
        }
      }
      // Escape to clear
      if (event.key === 'Escape') {
        event.preventDefault();
        if (screenshotUrl) {
          resetSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screenshotUrl, isLoading, handleGeneration, resetSelection]);

  // Listen for screenshot hotkey events  
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.receive('hotkey-screenshot-captured', (dataUrl: string) => {
        console.log('Screenshot captured, processing...', dataUrl.substring(0, 50) + '...');
        
        try {
          // Set notification immediately
          setNotification("📸 Screenshot captured! Processing...");
          
          // Use the data URL directly instead of converting to blob/file
          // This avoids blob URL lifecycle issues
          setScreenshotUrl(dataUrl);
          
          // Reset app state for a new image
          setResponses(null);
          setError(null);
          setIsLoading(false);
          setIsFunnier(false);
          setShowWelcome(false);

          // Auto-generate if enabled
          if (autoGenerate) {
            setTimeout(() => {
              console.log('Triggering auto-generation from screenshot...');
              handleGeneration(false, dataUrl); // Pass the dataUrl directly
              setNotification(null);
            }, 1000);
          } else {
            setNotification("📸 Screenshot captured! Click 'Generate Chat Messages' to continue.");
            setTimeout(() => setNotification(null), 3000);
          }
        } catch (error) {
          console.error('Error in screenshot handler:', error);
          setError('Failed to handle screenshot: ' + (error instanceof Error ? error.message : String(error)));
          setNotification(null);
        }
      });

      window.electronAPI.receive('hotkey-screenshot-error', (error: string) => {
        console.error('Screenshot hotkey error:', error);
        setError(`Screenshot failed: ${error}`);
        setNotification(null);
      });
    }
  }, [autoGenerate]);

  return (
    <ErrorBoundary>
      {notification && (
        <Notification message={notification} onClose={() => setNotification(null)} />
      )}
      {isDragging && (
        <div className="fixed inset-0 bg-cyan-500/20 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-cyan-900/90 border-2 border-dashed border-cyan-400 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">📸</div>
            <p className="text-xl text-cyan-100 font-semibold">Drop your screenshot here!</p>
            <p className="text-cyan-300 text-sm mt-2">We'll generate chat messages automatically</p>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Header 
          onOpenSettings={() => setShowSettings(true)}
          onOpenHistory={() => setShowMessageHistory(true)}
          onTakeScreenshot={handleTakeScreenshot}
          onCloseApp={handleCloseApp}
        />
        <main className="flex-grow container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 flex flex-col items-center">
          {/* Web version header for GitHub Pages */}
          {!window.electronAPI && (
            <div className="w-full max-w-6xl mx-auto mb-4 p-3 sm:p-4 bg-gradient-to-r from-cyan-700/20 to-purple-700/20 border border-cyan-400/30 rounded-lg text-center">
              <h2 className="text-lg sm:text-xl font-bold text-cyan-300 mb-1">Get your own AI-powered chat generator!</h2>
              <a href="https://github.com/involvex/new-world-chat-ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-purple-400 underline font-semibold">Visit the GitHub repo</a>
            </div>
          )}
          <div className="w-full max-w-6xl bg-gray-800/50 rounded-xl shadow-2xl p-3 sm:p-4 lg:p-6 border border-gray-700 hover-scale">
            
            {!screenshotUrl ? (
              // Step 1: Upload Area with Welcome Message
              <div>
                {showWelcome && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-blue-300 mb-2">🎮 Welcome to New World Chat AI!</h3>
                        <p className="text-blue-200 text-sm mb-2">
                          Get started by uploading a New World screenshot, or simply paste one from your clipboard.
                        </p>
                        <p className="text-blue-200 text-sm">
                          ⚡ <strong>Quick Start:</strong> Take a screenshot in-game (Print Screen), then paste it here with Ctrl+V!
                        </p>
                      </div>
                      <button
                        onClick={() => setShowWelcome(false)}
                        className="text-blue-300 hover:text-blue-100 text-xl flex-shrink-0 self-end sm:self-start touch-manipulation"
                        aria-label="Close welcome message"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Settings Panel */}
                <div className="mb-3 sm:mb-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                    <span className="text-sm text-gray-300">Auto-generate on paste</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoGenerate}
                        onChange={(e) => setAutoGenerate(e.target.checked)}
                        aria-label="Toggle auto-generation on paste"
                        title="Enable or disable auto-generation when pasting images"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    When enabled, chat messages will be generated automatically when you paste an image
                  </p>
                </div>

                <div 
                  onClick={triggerFileInput}
                  className="w-full max-w-2xl mx-auto border-2 border-dashed border-gray-600 rounded-xl p-6 sm:p-8 lg:p-10 cursor-pointer hover:border-cyan-500 hover:bg-gray-800/70 transition-all duration-300 flex flex-col items-center justify-center gradient-border touch-manipulation"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && triggerFileInput()}
                  aria-label="Upload screenshot area"
                >
                  <div className="gradient-border-inner p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-500 mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="text-lg sm:text-xl font-semibold text-gray-300 text-center">Click to upload an image</p>
                    <p className="text-gray-400 mt-1 text-center text-sm sm:text-base">
                      press <kbd className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Ctrl</kbd> + <kbd className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">V</kbd> to paste, 
                      or drag & drop
                    </p>
                    {autoGenerate && (
                      <p className="text-xs text-cyan-400 mt-2 text-center">✨ Auto-generation enabled - paste to start immediately!</p>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  aria-label="Upload image file"
                  title="Select an image file to upload"
                />
              </div>
            ) : (
              // Step 2: Preview & Actions
              <div className="flex flex-col items-center">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-300 mb-3 sm:mb-4 text-center">Screenshot Preview</h2>
                <div className="w-full max-w-2xl rounded-lg overflow-hidden shadow-lg border-2 border-gray-600 hover-scale">
                  <img src={screenshotUrl} alt="Screenshot preview" className="w-full h-auto max-h-48 sm:max-h-64 lg:max-h-80 object-contain bg-gray-700" loading="lazy" />
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 mt-4 sm:mt-6 w-full">
                   <button
                      onClick={resetSelection}
                      className="w-full sm:w-auto bg-gray-600 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:bg-gray-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800 text-sm sm:text-base touch-manipulation"
                    >
                      Use Another Image
                    </button>
                  
                  {!responses ? (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center w-full sm:w-auto">
                      <button
                        onClick={() => handleGeneration()}
                        disabled={isLoading}
                        className="w-full sm:w-auto bg-green-600 text-white font-bold py-2 sm:py-3 px-4 sm:px-8 rounded-lg shadow-lg hover:bg-green-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100 text-sm sm:text-base touch-manipulation"
                      >
                        {isLoading ? 'Generating...' : 'Generate Chat Messages'}
                      </button>
                      <button
                        onClick={() => handleGeneration(true)}
                        disabled={isLoading}
                        className="w-full sm:w-auto bg-purple-600 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:bg-purple-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100 text-sm sm:text-base touch-manipulation"
                      >
                        {isLoading ? 'Making it funnier...' : 'Generate Funny Messages'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center w-full sm:w-auto">
                      <button
                        onClick={() => handleGeneration()}
                        disabled={isLoading}
                        className="w-full sm:w-auto bg-cyan-600 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:bg-cyan-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100 text-sm sm:text-base touch-manipulation"
                      >
                        {isLoading ? 'Generating...' : currentMessageSet ? 'Continue Generating' : 'Generate More'}
                      </button>
                      <button
                        onClick={() => handleGeneration(true)}
                        disabled={isLoading || isFunnier}
                        className={`w-full sm:w-auto font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:scale-100 text-sm sm:text-base touch-manipulation ${
                          isFunnier 
                            ? 'bg-yellow-500 text-gray-900 focus:ring-yellow-400 cursor-default' 
                            : 'bg-purple-600 text-white hover:bg-purple-500 focus:ring-purple-400'
                        }`}
                      >
                        {isLoading ? 'Making it funnier...' : isFunnier ? '✨ Maximum Funniness! ✨' : currentMessageSet ? 'Continue with Funnier' : 'Make it Funnier!'}
                      </button>
                      
                      {/* Custom Prompts Dropdown */}
                      {customPrompts.length > 0 && (
                        <div className="relative w-full sm:w-auto">
                          <select
                            value={selectedCustomPrompt}
                            onChange={(e) => {
                              const promptId = e.target.value;
                              if (promptId) {
                                setSelectedCustomPrompt(promptId);
                                handleGeneration(false, undefined, promptId);
                              }
                            }}
                            disabled={isLoading}
                            title="Select a custom prompt"
                            aria-label="Custom prompts"
                            className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:from-orange-500 hover:to-orange-400 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100 text-sm sm:text-base touch-manipulation"
                          >
                            <option value="">🎯 Custom Prompts</option>
                            {customPrompts.map(prompt => (
                              <option key={prompt.id} value={prompt.id} className="bg-gray-800 text-white">
                                {prompt.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Display Results */}
            <div className="mt-6 sm:mt-8 w-full">
              {isLoading && <Loader />}
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 sm:p-4 rounded-lg text-center">
                  <p className="font-semibold mb-2 text-sm sm:text-base">Error</p>
                  <p className="text-sm sm:text-base break-words">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-sm underline hover:no-underline touch-manipulation"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {responses && responses.chatMessages.length > 0 && (
                <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-gray-700/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-300">Generated Responses ({responses.chatMessages.length})</h2>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      {currentMessageSet && (
                        <div className="text-xs sm:text-sm text-cyan-400 bg-cyan-500/10 px-2 sm:px-3 py-1 rounded-full border border-cyan-500/30 w-fit">
                          📁 {currentMessageSet.name}
                        </div>
                      )}
                      <button
                        onClick={handleSaveMessages}
                        className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-semibold text-xs sm:text-sm touch-manipulation"
                        title="Save these messages"
                      >
                        💾 Save Messages
                      </button>
                    </div>
                  </div>
                  {responses.chatMessages.map((msg, index) => (
                    <ResponseCard 
                      key={`${msg.message}-${index}`} 
                      chatMessage={msg} 
                      onPasteToNewWorld={window.electronAPI ? handlePasteToNewWorld : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
        <footer className="text-center text-gray-500 p-3 sm:p-4 text-xs sm:text-sm border-t border-gray-700/30">
          <div className="flex flex-col items-center justify-center space-y-2">
            {/* First line - Logo and Created by */}
            <div className="flex items-center gap-2">
              <img src={window.electronAPI ? "../icon.png" : "./icon.png"} alt="New World Chat AI Logo" className="h-6 w-6 sm:h-8 sm:w-8" onError={e => { e.currentTarget.src = './icon.png'; }} />
              <span>Created with ❤️ by</span>
              <span className="text-cyan-400 font-semibold">Ina Venox</span>
            </div>
            
            {/* Second line - Links */}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-3 text-xs">
              <a href="https://involvex.github.io/new-world-chat-ai" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors">
                🌐 Homepage
              </a>
              <span className="text-gray-600 hidden sm:inline">•</span>
              <a href="https://coff.ee/involvex" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                ☕ Buy me a coffee
              </a>
              <span className="text-gray-600 hidden sm:inline">•</span>
              <a href="https://github.com/involvex/new-world-chat-ai" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition-colors">
                📦 GitHub
              </a>
            </div>
            
            {/* Third line - New World joke */}
            <div className="text-xs text-gray-600 italic">
              "Why walk to Everfall when you can teleport... if you have azoth!" 🧭💨
            </div>
          </div>
        </footer>
      </div>
      
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onConfigUpdate={() => {}}
      />
      
      <AboutModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
      
      <MessageHistoryModal
        isOpen={showMessageHistory}
        onClose={() => setShowMessageHistory(false)}
        onLoadMessageSet={handleLoadMessageSet}
      />
      
      <SaveMessageDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        messages={responses?.chatMessages || []}
        screenshotUrl={screenshotUrl || undefined}
        onSave={handleMessageSetSaved}
      />
      
      {/* Save notification */}
      {saveNotification && (
        <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-60 bg-green-600 text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg max-w-sm sm:max-w-none mx-auto sm:mx-0 text-sm sm:text-base">
          {saveNotification}
        </div>
      )}
    </ErrorBoundary>
  );
}

export default function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}