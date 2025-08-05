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
  const [isDemoMode, setIsDemoMode] = useState(false);

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
        // Check if we're in demo mode by looking for demo messages
        const isDemo = response.chatMessages?.some((msg: any) => 
          ['look at this screenshot', 'wow what a view', 'this game is amazing'].includes(msg.message || msg.text)
        );
        setIsDemoMode(isDemo);
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
      background: {
        default: '#0f172a',
        paper: '#1e293b',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            padding: '8px 16px',
          },
          contained: {
            boxShadow: '0 4px 14px 0 rgba(0, 188, 212, 0.3)',
            '&:hover': {
              boxShadow: '0 6px 20px 0 rgba(0, 188, 212, 0.4)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
                 <Box sx={{ flexGrow: 1 }}>
           {/* GitHub Banner */}
           <Box 
             sx={{ 
               backgroundColor: 'grey.800',
               borderBottom: '1px solid',
               borderColor: 'grey.700',
               py: 1
             }}
           >
             <Container maxWidth="lg">
               <Box sx={{ 
                 display: 'flex', 
                 justifyContent: 'center', 
                 alignItems: 'center',
                 gap: 1
               }}>
                 <Typography variant="body2" color="text.secondary">
                   🌟 Star this project on
                 </Typography>
                 <a 
                   href="https://github.com/involvex/new-world-chat-ai" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style={{ 
                     display: 'inline-flex', 
                     alignItems: 'center', 
                     gap: '4px',
                     color: '#00bcd4', 
                     textDecoration: 'none',
                     fontWeight: 'bold',
                     transition: 'all 0.2s ease'
                   }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.color = '#00d4aa';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.color = '#00bcd4';
                   }}
                 >
                   GitHub
                 </a>
                 <Typography variant="body2" color="text.secondary">
                   to support development! 🚀
                 </Typography>
               </Box>
             </Container>
           </Box>
           
           <AppBar position="static" sx={{ backgroundColor: 'grey.900' }}>
            <Toolbar>
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                                 <Box 
                   sx={{ 
                     width: 40, 
                     height: 40, 
                     borderRadius: '50%', 
                     background: 'linear-gradient(135deg, #00bcd4 0%, #00d4aa 100%)',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     mr: 2,
                     overflow: 'hidden'
                   }}
                 >
                   <img 
                     src="./icon.png" 
                     alt="New World Chat AI Icon" 
                     style={{ 
                       width: '80%', 
                       height: '80%', 
                       objectFit: 'contain',
                       borderRadius: '50%'
                     }} 
                   />
                 </Box>
                <Typography variant="h6" component="div">
                  New World Chat AI
                </Typography>
              </Box>
              <IconButton
                color="inherit"
                title="Settings"
                onClick={() => setShowSettings(true)}
              >
                <span role="img" aria-label="settings">⚙️</span>
              </IconButton>
            </Toolbar>
          </AppBar>

                     <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
             <Paper 
               elevation={0} 
               sx={{ 
                 p: 4, 
                 backgroundColor: 'rgba(30, 41, 59, 0.8)',
                 backdropFilter: 'blur(10px)',
                 border: isDragging ? '2px dashed #00bcd4' : '1px solid rgba(148, 163, 184, 0.1)',
                 transition: 'all 0.3s ease-in-out',
                 borderRadius: 3,
                 boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                 '&:hover': {
                   boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                 }
               }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                                 <Box 
                   sx={{ 
                     width: 100, 
                     height: 100, 
                     borderRadius: '50%', 
                     background: 'linear-gradient(135deg, #00bcd4 0%, #00d4aa 50%, #00bcd4 100%)',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     mx: 'auto',
                     mb: 3,
                     boxShadow: '0 8px 32px rgba(0, 188, 212, 0.4)',
                     position: 'relative',
                     overflow: 'hidden',
                     '&::before': {
                       content: '""',
                       position: 'absolute',
                       top: '-2px',
                       left: '-2px',
                       right: '-2px',
                       bottom: '-2px',
                       borderRadius: '50%',
                       background: 'linear-gradient(135deg, #00bcd4, #00d4aa, #00bcd4)',
                       zIndex: -1,
                       opacity: 0.6,
                       filter: 'blur(8px)',
                     },
                     animation: 'pulse 2s infinite',
                     '@keyframes pulse': {
                       '0%': {
                         transform: 'scale(1)',
                       },
                       '50%': {
                         transform: 'scale(1.05)',
                       },
                       '100%': {
                         transform: 'scale(1)',
                       },
                     },
                   }}
                 >
                   <img 
                     src="./icon.png" 
                     alt="New World Chat AI Icon" 
                     style={{ 
                       width: '80%', 
                       height: '80%', 
                       objectFit: 'contain',
                       borderRadius: '50%'
                     }} 
                   />
                 </Box>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  New World Chat AI
                </Typography>
                                 <Typography variant="body1" color="text.secondary" gutterBottom>
                   Upload an image or drag and drop to generate chat messages
                 </Typography>
                                   <Box sx={{ 
                    mt: 3, 
                    p: 3, 
                    background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 193, 7, 0.2)',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, #ffc107, #ff9800, #ffc107)',
                    }
                  }}>
                    <Typography variant="body2" color="warning.main" sx={{ 
                      textAlign: 'center',
                      fontWeight: 500,
                      lineHeight: 1.6
                    }}>
                      💡 <strong>Demo Mode:</strong> No API key configured. Get your free API key from{' '}
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#00bcd4', 
                          textDecoration: 'none',
                          fontWeight: 'bold',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#00d4aa';
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#00bcd4';
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        Google AI Studio
                      </a>
                      {' '}for full AI-powered responses! 🚀
                    </Typography>
                  </Box>
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
                     <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <Typography variant="h6">
                           Generated Messages:
                         </Typography>
                         {isDemoMode && (
                           <Box
                             sx={{
                               px: 1,
                               py: 0.5,
                               backgroundColor: 'rgba(255, 193, 7, 0.2)',
                               border: '1px solid #ffc107',
                               borderRadius: '4px',
                               fontSize: '0.75rem',
                               color: '#ffc107'
                             }}
                           >
                             DEMO MODE
                           </Box>
                         )}
                       </Box>
                       <Button
                         size="small"
                         variant="outlined"
                         onClick={() => {
                           const allMessages = responses.chatMessages
                             .map((msg: any) => msg.text || msg.message || msg)
                             .join('\n\n');
                           navigator.clipboard.writeText(allMessages);
                           setNotification('All messages copied to clipboard!');
                         }}
                         sx={{ 
                           fontSize: '0.875rem',
                           borderColor: 'grey.500',
                           color: 'grey.300',
                           '&:hover': {
                             borderColor: '#00bcd4',
                             color: '#00bcd4',
                             backgroundColor: 'rgba(0, 188, 212, 0.1)'
                           }
                         }}
                       >
                         📋 Copy All
                       </Button>
                     </Box>
                                         <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                       {responses.chatMessages.map((message: any, index: number) => (
                         <Paper 
                           key={index} 
                           sx={{ 
                             p: 3, 
                             backgroundColor: 'rgba(55, 65, 81, 0.8)',
                             backdropFilter: 'blur(10px)',
                             position: 'relative',
                             border: '1px solid rgba(148, 163, 184, 0.1)',
                             borderRadius: 2,
                             transition: 'all 0.3s ease',
                             '&:hover': { 
                               backgroundColor: 'rgba(75, 85, 99, 0.9)',
                               transform: 'translateY(-2px)',
                               boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                             }
                           }}
                         >
                           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                             <Typography variant="body1" sx={{ flex: 1 }}>
                               {message.text || message.message || message}
                             </Typography>
                             <Button
                               size="small"
                               variant="outlined"
                               onClick={() => {
                                 navigator.clipboard.writeText(message.text || message.message || message);
                                 setNotification('Message copied to clipboard!');
                               }}
                               sx={{ 
                                 minWidth: 'auto',
                                 px: 1,
                                 py: 0.5,
                                 fontSize: '0.75rem',
                                 borderColor: 'grey.500',
                                 color: 'grey.300',
                                 '&:hover': {
                                   borderColor: '#00bcd4',
                                   color: '#00bcd4',
                                   backgroundColor: 'rgba(0, 188, 212, 0.1)'
                                 }
                               }}
                             >
                               📋 Copy
                             </Button>
                           </Box>
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
          
          {/* Footer */}
          <Box 
            component="footer" 
            sx={{ 
              mt: 6, 
              py: 3, 
              backgroundColor: 'grey.900',
              borderTop: '1px solid',
              borderColor: 'grey.700'
            }}
          >
            <Container maxWidth="lg">
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' }, 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Created with ❤️ by{' '}
                    <a 
                      href="https://github.com/involvex" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#00bcd4', textDecoration: 'none' }}
                    >
                      Ina Venox
                    </a>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    <a 
                      href="https://involvex.github.io/new-world-chat-ai/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#00bcd4', textDecoration: 'none' }}
                    >
                      involvex.github.io/new-world-chat-ai
                    </a>
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Support the project:
                  </Typography>
                  <a 
                    href="https://buymeacoffee.com/involvex" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      color: '#00bcd4', 
                      textDecoration: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #00bcd4',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#00bcd4';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#00bcd4';
                    }}
                  >
                    ☕ Buy me a coffee
                  </a>
                </Box>
              </Box>
            </Container>
          </Box>
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default WebApp; 