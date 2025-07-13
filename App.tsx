import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { generateChatResponses } from './services/geminiService';
import type { ApiResponse, ChatMessage, SavedMessageSet } from './types';
import SettingsModal from './src/components/SettingsModal';
import MessageHistoryModal from './src/components/MessageHistoryModal';
import SaveMessageDialog from './src/components/SaveMessageDialog';

// --- Helper UI Components (memoized for performance) ---

const Header = memo<{ 
  onOpenSettings: () => void; 
  onOpenHistory: () => void; 
  onTakeScreenshot: () => void;
}>(({ onOpenSettings, onOpenHistory, onTakeScreenshot }) => (
  <header className="text-center p-6 border-b border-gray-700">
    <div className="flex justify-between items-center max-w-4xl mx-auto">
      <div className="flex-1">
        <h1 className="text-4xl font-bold text-cyan-400 tracking-wider">New World Chat AI</h1>
        <p className="text-gray-400 mt-2">Upload or paste a game screenshot to generate contextual chat messages.</p>
        <div className="mt-3 text-sm text-cyan-300 space-y-1">
          <div>💡 <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-700 rounded">Ctrl+V</kbd> to paste and auto-generate!</div>
          <div className="text-xs text-gray-500">
            <kbd className="px-1 py-0.5 font-mono bg-gray-700 rounded">Ctrl+Enter</kbd> Generate • 
            <kbd className="px-1 py-0.5 font-mono bg-gray-700 rounded ml-1">Ctrl+Shift+Enter</kbd> Funny • 
            <kbd className="px-1 py-0.5 font-mono bg-gray-700 rounded ml-1">Ctrl+Shift+S</kbd> Screenshot •
            <kbd className="px-1 py-0.5 font-mono bg-gray-700 rounded ml-1">Esc</kbd> Clear
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenHistory}
          className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
          title="Message History"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          onClick={onTakeScreenshot}
          className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
          title="Take Screenshot (Ctrl+Shift+S)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
          title="Settings"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
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
  <div className="fixed top-4 right-4 z-50 bg-cyan-900/90 border border-cyan-500 text-cyan-100 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-bounce">
    <div className="flex items-center space-x-2">
      <span>{message}</span>
      <button
        onClick={onClose}
        className="text-cyan-300 hover:text-cyan-100 text-lg"
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
}

const ResponseCard = memo<ResponseCardProps>(({ chatMessage }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(chatMessage.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [chatMessage.message]);

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

  const buttonClassName = useMemo(() => 
    `p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
      copied 
        ? 'bg-green-500 text-white focus:ring-green-400' 
        : 'bg-gray-600 text-gray-300 hover:bg-cyan-500 hover:text-white focus:ring-cyan-400'
    }`, [copied]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between shadow-lg transition-all duration-300 hover:bg-gray-700 hover:shadow-cyan-500/10">
      <p className="text-lg font-mono text-gray-200">{chatMessage.message}</p>
      <button
        onClick={handleCopy}
        className={buttonClassName}
        aria-label="Copy message"
      >
        {copied ? CheckIcon : ClipboardIcon}
      </button>
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
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  // App config state managed in SettingsModal
  const [currentMessageSet, setCurrentMessageSet] = useState<SavedMessageSet | null>(null);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
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
    // Config is managed in SettingsModal
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

  const handleGeneration = useCallback(async (makeItFunnier: boolean = false, imageUrl?: string) => {
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
      const result = await generateChatResponses(imageToUse, funninessLevel);
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
        />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl bg-gray-800/50 rounded-xl shadow-2xl p-6 border border-gray-700 hover-scale">
            
            {!screenshotUrl ? (
              // Step 1: Upload Area with Welcome Message
              <div>
                {showWelcome && (
                  <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-300 mb-2">🎮 Welcome to New World Chat AI!</h3>
                        <p className="text-blue-200 text-sm mb-2">
                          Get started by uploading a New World screenshot, or simply paste one from your clipboard.
                        </p>
                        <p className="text-blue-200 text-sm">
                          ⚡ <strong>Quick Start:</strong> Take a screenshot in-game (Print Screen), then paste it here with Ctrl+V!
                        </p>
                      </div>
                      <button
                        onClick={() => setShowWelcome(false)}
                        className="text-blue-300 hover:text-blue-100 text-xl"
                        aria-label="Close welcome message"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Settings Panel */}
                <div className="mb-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                  <div className="flex items-center justify-between">
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
                  className="w-full max-w-2xl mx-auto border-2 border-dashed border-gray-600 rounded-xl p-10 cursor-pointer hover:border-cyan-500 hover:bg-gray-800/70 transition-all duration-300 flex flex-col items-center justify-center gradient-border"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && triggerFileInput()}
                  aria-label="Upload screenshot area"
                >
                  <div className="gradient-border-inner p-8 flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="text-xl font-semibold text-gray-300">Click to upload an image</p>
                    <p className="text-gray-400 mt-1">
                      press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Ctrl</kbd> + <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">V</kbd> to paste, 
                      or drag & drop
                    </p>
                    {autoGenerate && (
                      <p className="text-xs text-cyan-400 mt-2">✨ Auto-generation enabled - paste to start immediately!</p>
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
                <h2 className="text-2xl font-semibold text-gray-300 mb-4">Screenshot Preview</h2>
                <div className="w-full max-w-2xl rounded-lg overflow-hidden shadow-lg border-2 border-gray-600 hover-scale">
                  <img src={screenshotUrl} alt="Screenshot preview" className="w-full h-auto" loading="lazy" />
                </div>
                <div className="flex flex-wrap justify-center items-center gap-4 mt-6">
                   <button
                      onClick={resetSelection}
                      className="bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                    >
                      Use Another Image
                    </button>
                  
                  {!responses ? (
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => handleGeneration()}
                        disabled={isLoading}
                        className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-green-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
                      >
                        {isLoading ? 'Generating...' : 'Generate Chat Messages'}
                      </button>
                      <button
                        onClick={() => handleGeneration(true)}
                        disabled={isLoading}
                        className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-purple-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
                      >
                        {isLoading ? 'Making it funnier...' : 'Generate Funny Messages'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleGeneration()}
                        disabled={isLoading}
                        className="bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-cyan-500 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
                      >
                        {isLoading ? 'Generating...' : currentMessageSet ? 'Continue Generating' : 'Generate More'}
                      </button>
                      <button
                        onClick={() => handleGeneration(true)}
                        disabled={isLoading || isFunnier}
                        className={`font-bold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:scale-100 ${
                          isFunnier 
                            ? 'bg-yellow-500 text-gray-900 focus:ring-yellow-400 cursor-default' 
                            : 'bg-purple-600 text-white hover:bg-purple-500 focus:ring-purple-400'
                        }`}
                      >
                        {isLoading ? 'Making it funnier...' : isFunnier ? '✨ Maximum Funniness! ✨' : currentMessageSet ? 'Continue with Funnier' : 'Make it Funnier!'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Display Results */}
            <div className="mt-8 w-full">
              {isLoading && <Loader />}
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center">
                  <p className="font-semibold mb-2">Error</p>
                  <p>{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-sm underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {responses && responses.chatMessages.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-gray-300">Generated Responses ({responses.chatMessages.length})</h2>
                    <div className="flex items-center space-x-3">
                      {currentMessageSet && (
                        <div className="text-sm text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
                          📁 {currentMessageSet.name}
                        </div>
                      )}
                      <button
                        onClick={handleSaveMessages}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-semibold text-sm"
                        title="Save these messages"
                      >
                        💾 Save Messages
                      </button>
                    </div>
                  </div>
                  {responses.chatMessages.map((msg, index) => (
                    <ResponseCard key={`${msg.message}-${index}`} chatMessage={msg} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
        <footer className="text-center text-gray-500 p-4 text-sm">
          <p>by Ina Venox | Optimized for performance ⚡</p>
        </footer>
      </div>
      
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onConfigUpdate={() => {}}
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
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-60 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
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