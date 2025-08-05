import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateChatResponses } from './services/geminiService';
import {
  Button, Select, MenuItem, Checkbox, FormControlLabel, Snackbar, AppBar, Toolbar, Typography, IconButton, Container, Paper, Box, Modal, CssBaseline
} from '@mui/material';
import type { SavedMessageSet } from './types';
import WebSettingsModal from './src/components/WebSettingsModal';
import { webSettingsService, type WebAppConfig } from './services/webSettingsService';
import { ThemeProvider, createTheme } from '@mui/material/styles';

type CustomPromptType = string | { prompt: string; label?: string; type?: string };

// Minimal ErrorBoundary for runtime safety
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? <div>Something went wrong.</div> : this.props.children; }
}

function WebApp() {
  // --- State ---
  const [selectedCustomPrompt] = useState<CustomPromptType>('');
  const hotkeyHints = [
    { key: 'Ctrl+Alt+S', label: 'Screenshot' },
    { key: 'Ctrl+Alt+G', label: 'Generate' },
    { key: 'Ctrl+Alt+F', label: 'Funnier' },
    { key: 'Ctrl+Alt+N', label: 'New Image' }
  ];
  const [autoGenerate, setAutoGenerate] = useState(() => {
    const saved = localStorage.getItem('autoGenerate');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [notification, setNotification] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customButtonLabel, setCustomButtonLabel] = useState('Custom Action');
  const [customActionEnabled, setCustomActionEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add missing state for screenshotUrl, responses, error, isLoading
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(undefined);
  const [responses, setResponses] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // --- Handlers ---
  const triggerFileInput = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const handleGeneration = useCallback(
    async (
      makeItFunnier = false,
      imageUrl?: string,
      customPromptId?: string,
      messageCount = 5
    ) => {
      setIsLoading(true);
      setError(undefined);
      setResponses(undefined);
      const funninessLevel = makeItFunnier ? 2 : 1;
      const customPrompt = customPromptId || (typeof selectedCustomPrompt === 'string' ? selectedCustomPrompt : selectedCustomPrompt.prompt);
      const imageToUse = imageUrl ?? screenshotUrl ?? undefined;
      try {
        const response = await generateChatResponses(imageToUse || '', makeItFunnier, customPrompt, messageCount);
        setResponses(response);
      } catch (err: any) {
        setError(err?.message || 'Failed to generate chat messages');
      } finally {
        setIsLoading(false);
      }
    }, [selectedCustomPrompt, screenshotUrl]);

  const processImageFile = useCallback(
    (fileOrUrl: File | string | undefined, _autoGen: boolean) => {
      let imageUrl: string | undefined = undefined;
      if (!fileOrUrl) {
        setError('No image selected');
        return;
      }
      if (typeof fileOrUrl === 'string') {
        imageUrl = fileOrUrl;
      } else {
        imageUrl = URL.createObjectURL(fileOrUrl);
      }
      setScreenshotUrl(imageUrl);
      setError(undefined);
      setResponses(undefined);
    }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file, autoGenerate);
    }
  }, [processImageFile, autoGenerate]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      processImageFile(files[0], autoGenerate);
    }
  }, [processImageFile, autoGenerate]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const resetSelection = useCallback(() => {
    setScreenshotUrl(undefined);
    setResponses(undefined);
    setError(undefined);
  }, []);

  const handleConfigUpdate = useCallback((config: WebAppConfig) => {
    if (typeof config.customActionEnabled === 'boolean') {
      setCustomActionEnabled(config.customActionEnabled);
    }
    if (typeof config.customButtonLabel === 'string') {
      setCustomButtonLabel(config.customButtonLabel);
    }
  }, []);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await webSettingsService.getConfig();
        if (typeof config.customActionEnabled === 'boolean') {
          setCustomActionEnabled(config.customActionEnabled);
        }
        if (typeof config.customButtonLabel === 'string') {
          setCustomButtonLabel(config.customButtonLabel);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();
  }, []);

  // Save autoGenerate to localStorage
  useEffect(() => {
    localStorage.setItem('autoGenerate', JSON.stringify(autoGenerate));
  }, [autoGenerate]);

  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#00bcd4',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static" sx={{ backgroundColor: 'grey.900' }}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                New World Chat AI
              </Typography>
              <IconButton
                color="inherit"
                title="Settings"
                onClick={() => setShowSettings(true)}
              >
                <span role="img" aria-label="settings">⚙️</span>
              </IconButton>
            </Toolbar>
          </AppBar>

          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                backgroundColor: 'grey.800',
                border: isDragging ? '2px dashed #00bcd4' : '2px dashed transparent',
                transition: 'border 0.2s ease-in-out'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h5" component="h1" gutterBottom>
                  New World Chat AI
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Upload an image or drag and drop to generate chat messages
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  aria-label="Select image file"
                />
                
                <Button
                  variant="contained"
                  onClick={triggerFileInput}
                  sx={{ mb: 2 }}
                >
                  📸 Select Image
                </Button>

                {screenshotUrl && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <img 
                      src={screenshotUrl} 
                      alt="Screenshot" 
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                    />
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        onClick={() => handleGeneration()}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Generating...' : 'Generate Chat Messages'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => handleGeneration(true)}
                        disabled={isLoading}
                      >
                        Make it Funnier
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={resetSelection}
                      >
                        New Image
                      </Button>
                    </Box>
                  </Box>
                )}

                {error && (
                  <Typography color="error" sx={{ mt: 2 }}>
                    {error}
                  </Typography>
                )}

                {responses && responses.chatMessages && (
                  <Box sx={{ mt: 3, width: '100%' }}>
                    <Typography variant="h6" gutterBottom>
                      Generated Messages:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {responses.chatMessages.map((message: any, index: number) => (
                        <Paper 
                          key={index} 
                          sx={{ 
                            p: 2, 
                            backgroundColor: 'grey.700',
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'grey.600' }
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(message.text || message.message || message);
                            setNotification('Message copied to clipboard!');
                          }}
                        >
                          <Typography variant="body1">
                            {message.text || message.message || message}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Hotkeys: {hotkeyHints.map(hint => `${hint.key} - ${hint.label}`).join(', ')}
                  </Typography>
                </Box>

                                 <FormControlLabel
                   control={
                     <Checkbox
                       id="auto-generate-web"
                       checked={autoGenerate}
                       onChange={(e) => setAutoGenerate(e.target.checked)}
                     />
                   }
                   label="Auto-generate on paste"
                 />
              </Box>
            </Paper>

            {/* Settings Modal */}
            <WebSettingsModal
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              onConfigUpdate={handleConfigUpdate}
              autoGenerate={autoGenerate}
              setAutoGenerate={setAutoGenerate}
              customButtonLabel={customButtonLabel}
              setCustomButtonLabel={setCustomButtonLabel}
              customActionEnabled={customActionEnabled}
              setCustomActionEnabled={setCustomActionEnabled}
            />

            {/* Notification */}
            <Snackbar
              open={!!notification}
              autoHideDuration={3000}
              onClose={() => setNotification(undefined)}
              message={notification}
            />
          </Container>
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default WebApp; 