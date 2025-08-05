import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateChatResponses } from './services/geminiService';
import {
  Button, Select, MenuItem, Checkbox, FormControlLabel, Snackbar, AppBar, Toolbar, Typography, IconButton, Container, Paper, Box, Modal, CssBaseline
} from '@mui/material';
import type { SavedMessageSet } from './types';
import SettingsModal from './src/components/SettingsModal';
import MessageHistoryModal from './src/components/MessageHistoryModal';
import SaveMessageDialog from './src/components/SaveMessageDialog';
import AboutModal from './src/components/AboutModal';
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

function App() {
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
  const [showMessageHistory, setShowMessageHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | undefined>(undefined);
  const [customButtonLabel, setCustomButtonLabel] = useState('Custom Action');
  const [customActionEnabled, setCustomActionEnabled] = useState(true);
  const [latestVersion, setLatestVersion] = useState('');
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
        let response;
        if (window.electronAPI && typeof window.electronAPI.generateChatMessages === 'function') {
          response = await window.electronAPI.generateChatMessages({ funninessLevel, customPrompt, imageToUse, messageCount });
        } else {
          response = await generateChatResponses(imageToUse || '', makeItFunnier, customPrompt, messageCount);
        }
        setResponses(response);
      } catch (err: any) {
        setError(err?.message || 'Failed to generate chat messages');
      } finally {
        setIsLoading(false);
        // setShowWelcome(false); // removed unused
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
      setResponses(undefined);
      setError(undefined);
      setIsLoading(false);
      // setShowWelcome(false); // removed unused
      if (autoGenerate && imageUrl) {
        setTimeout(() => {
          handleGeneration(false, imageUrl);
        }, 500);
      }
    }, [autoGenerate, handleGeneration]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      processImageFile(event.target.files?.[0] ?? undefined, false);
    }, [processImageFile]);

  const resetSelection = useCallback(() => {
    setScreenshotUrl(undefined);
    setResponses(undefined);
    setError(undefined);
    setIsLoading(false);
    // setShowWelcome(true); // removed unused
  }, []);

  const handleLoadMessageSet = useCallback((messageSet: SavedMessageSet) => {
    setScreenshotUrl(messageSet.screenshotUrl ? messageSet.screenshotUrl : undefined);
    setResponses({ chatMessages: messageSet.messages || [] });
    setShowMessageHistory(false);
  }, []);

  const handleMessageSetSaved = useCallback(() => {
    setSaveNotification('Message set saved!');
    setShowSaveDialog(false);
    setTimeout(() => setSaveNotification(undefined), 3000);
  }, []);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('autoGenerate', JSON.stringify(autoGenerate));
  }, [autoGenerate]);

  useEffect(() => {
    if (window.electronAPI) {
      const savedResponses = localStorage.getItem('lastSessionResponses');
      const savedScreenshot = localStorage.getItem('lastSessionScreenshotUrl');
      if (savedResponses && savedScreenshot) {
        try {
          setResponses(JSON.parse(savedResponses));
          setScreenshotUrl(savedScreenshot);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI && responses && responses.chatMessages && responses.chatMessages.length > 0 && screenshotUrl) {
      localStorage.setItem('lastSessionResponses', JSON.stringify(responses));
      localStorage.setItem('lastSessionScreenshotUrl', screenshotUrl);
    }
  }, [responses, screenshotUrl]);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getConfig) {
      window.electronAPI.getConfig().then((config: any) => {
        if (typeof config.customButtonLabel === 'string') setCustomButtonLabel(config.customButtonLabel);
        if (typeof config.customActionEnabled === 'boolean') setCustomActionEnabled(config.customActionEnabled);
        else setCustomActionEnabled(false);
      }).catch((error: any) => {
        console.error('Failed to load app configuration:', error);
      });
    }
  }, []);

  useEffect(() => {
    fetch('https://api.github.com/repos/involvex/new-world-chat-ai/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (data && data.tag_name) setLatestVersion(data.tag_name.replace(/^v/, ''));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      const hotkeyGenerate = () => { if (screenshotUrl && !isLoading) handleGeneration(); };
      const hotkeyGenerateFunny = () => { if (screenshotUrl && !isLoading) handleGeneration(true); };
      const hotkeyNewImage = () => { if (screenshotUrl) resetSelection(); };
      window.electronAPI.receive('hotkey-generate', hotkeyGenerate);
      window.electronAPI.receive('hotkey-generate-funny', hotkeyGenerateFunny);
      window.electronAPI.receive('hotkey-new-image', hotkeyNewImage);
      window.electronAPI.receive('hotkey-screenshot-captured', (dataUrl: string) => {
        setNotification('📸 Screenshot captured! Processing...');
        setScreenshotUrl(dataUrl);
        setResponses(undefined);
        setError(undefined);
        setIsLoading(false);
        // setShowWelcome(false); // removed unused
        if (autoGenerate) {
          setTimeout(() => {
            handleGeneration(false, dataUrl);
            setNotification(undefined);
          }, 1000);
        } else {
          setNotification("📸 Screenshot captured! Click 'Generate Chat Messages' to continue.");
          setTimeout(() => setNotification(undefined), 3000);
        }
      });
      window.electronAPI.receive('hotkey-screenshot-error', (error: string) => {
        setError(`Screenshot failed: ${error}`);
        setNotification(undefined);
      });
    }
  }, [autoGenerate, handleGeneration, resetSelection, screenshotUrl, isLoading]);

  const handleTakeScreenshot = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.takeScreenshot) {
      try {
        const result = await window.electronAPI.takeScreenshot();
        if (result.success && result.dataUrl) {
          fetch(result.dataUrl)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], 'screenshot.png', { type: 'image/png' });
              processImageFile(file, true);
            });
        } else {
          setError(`Screenshot failed: ${result.error}`);
        }
      } catch {
        setError('Failed to take screenshot');
      }
    } else {
      setError('Web version: Please take a screenshot manually (Print Screen) and paste it with Ctrl+V');
    }
  }, [processImageFile]);

  const handleCloseApp = useCallback(async () => {
    if (window.electronAPI && window.electronAPI.quitApp) {
      try {
        await window.electronAPI.quitApp();
      } catch (error: any) {
        console.error('Failed to close app:', error);
      }
    }
  }, []);

  // --- UI ---
  // Add missing messageCount state
  const [messageCount, setMessageCount] = useState<number>(5);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={createTheme()}>
        <CssBaseline />
        <Box minHeight="100vh" bgcolor="blue.900" display="flex" flexDirection="column">
          {/* Notification */}
          {notification && (
            <Snackbar open={!!notification} autoHideDuration={3000} onClose={() => setNotification(undefined)} message={notification} />
          )}
          {/* AppBar Header */}
        <AppBar position="fixed" color="primary" sx={{ borderRadius: 0, left: 0, right: 0, top: 0, height: '80px', width: '100vw', minHeight: 24, boxShadow: 6, background: 'linear-gradient(90deg, #031b6b71 0%, #0891b2 80%, #0891b2 100%)', zIndex: 140 }}>
            <Toolbar sx={{ minHeight: 24, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <img src="icon.png" alt="App Logo" style={{ width: 45, height: 45, borderRadius: 8, boxShadow: '0 2px 8px rgba(6,182,212,0.15)', border: '2px solid #22d3ee' }} />
                <Box>
                  <Typography variant="h4" color="cyan.200" fontWeight={700} sx={{ mb: 0.25, fontSize: 14 }}>New World Chat AI</Typography>
                  <Typography variant="caption" color="cyan.100" sx={{ fontSize: 10 }}>Upload or paste a game screenshot to generate contextual chat messages with AI-powered humor.</Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ bgcolor: 'grey.800', border: '2px solid #22d3ee', borderRadius: 2, boxShadow: 3, px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { bgcolor: 'cyan.900' } }} onClick={() => setShowMessageHistory(true)}>
                  <IconButton edge="start" color="info" size="small" sx={{ p: 0.5 }} title="History" >
                    <span role="img" aria-label="history">🕑</span>
                  </IconButton>
                  {/* <Typography color="cyan.200" fontWeight={700} fontSize={14} sx={{ ml: 0.5 }}>History</Typography> */}
                </Box>
                <Box sx={{ bgcolor: 'grey.800', border: '2px solid #22d3ee', borderRadius: 2, boxShadow: 3, px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { bgcolor: 'cyan.900' } }} onClick={handleTakeScreenshot}>
                  <IconButton color="success" size="small" sx={{ p: 0.5 }} title="Screenshot">
                    <span role="img" aria-label="screenshot">📸</span>
                  </IconButton>
                  {/* <Typography color="success.main" fontWeight={700} fontSize={14} sx={{ ml: 0.5 }}>Screenshot</Typography> */}
                </Box>
                {window.electronAPI && (
                  <>
                    <Box sx={{ bgcolor: 'grey.800', border: '2px solid #22d3ee', borderRadius: 2, boxShadow: 3, px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { bgcolor: 'cyan.900' } }} onClick={() => setShowSettings(true)}>
                      <IconButton color="info" size="small" sx={{ p: 0.5 }} title="Settings">
                        <span role="img" aria-label="settings">⚙️</span>
                      </IconButton>
                      {/* <Typography color="cyan.200" fontWeight={700} fontSize={14} sx={{ ml: 0.5 }}>Settings</Typography> */}
                    </Box>
                    <Box sx={{ bgcolor: 'grey.800', border: '2px solid #22d3ee', borderRadius: 2, boxShadow: 3, px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { bgcolor: 'cyan.900' } }} onClick={() => setShowAbout(true)}>
                      <IconButton color="info" size="small" sx={{ p: 0.5 }} title="About">
                        <span role="img" aria-label="about">❓</span>
                      </IconButton>
                      {/* <Typography color="cyan.200" fontWeight={700} fontSize={14} sx={{ ml: 0.5 }}>About</Typography> */}
                    </Box>
                    <Box sx={{ bgcolor: 'grey.800', border: '2px solid #22d3ee', borderRadius: 2, boxShadow: 3, px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', '&:hover': { bgcolor: 'red.900' } }} onClick={handleCloseApp}>
                      <IconButton color="error" size="small" sx={{ p: 0.5 }} title="Close App">
                        <span role="img" aria-label="close">❌</span>
                      </IconButton>
                      {/* <Typography color="error.main" fontWeight={700} fontSize={14} sx={{ ml: 0.5 }}>Close</Typography> */}
                    </Box>
                  </>
                )}
              </Box>
            </Toolbar>
          </AppBar>
          {/* Shortcut hints */}
          <Toolbar />
          <Container maxWidth={false} disableGutters sx={{ mt: 3, mb: 4, px: 0 }}>
            <Box display="flex" flexDirection="column" alignItems="stretch" justifyContent="center" sx={{ minHeight: '70vh', width: '100vw' }}>
              <Box display="flex" flexWrap="wrap" gap={2} mt={1} color="cyan.400" fontSize={12} justifyContent="center" mb={3} bgcolor="blue.200" borderRadius={2} boxShadow={2} width="100vw" maxWidth="100vw" px={2}>
                {hotkeyHints.map((hint, idx) => (
                  <Box key={idx} component="span" bgcolor="grey.800" px={1} py={0.5} borderRadius={1} sx={{ color: idx === 0 ? 'warning.main' : idx === 1 ? 'info.main' : idx === 2 ? 'secondary.main' : 'success.main', fontWeight: 700, fontSize: 13, boxShadow: 2 }}>
                    <kbd style={{ color: '#22d3ee', fontWeight: 700 }}>{hint.key}</kbd> {hint.label}
                  </Box>
                ))}
              </Box>
              {/* Screenshot upload area: always shown if no screenshot */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                title="Upload Screenshot"
              />
              {!screenshotUrl && (
                <Paper elevation={8} sx={{ width: '100vw', maxWidth: 900, mx: 'auto', mt: 4, p: 3, bgcolor: 'grey.900', border: '2px solid', borderColor: 'cyan.700', borderRadius: 4, textAlign: 'center', boxShadow: 8 }}>
                  <Box mb={2} display="flex" alignItems="center" gap={2} justifyContent="center">
                    <Typography color="cyan.200" fontWeight={700} fontSize={20} sx={{ letterSpacing: 1 }}>Auto-generate on paste</Typography>
                    {window.electronAPI ? (
                      <Button variant="outlined" color="warning" size="small" onClick={() => setShowSettings(true)} sx={{ fontWeight: 700, borderRadius: 2 }}>
                        ✨ Auto-generation enabled - click to configure in Settings
                      </Button>
                    ) : (
                      <FormControlLabel
                        control={<Checkbox checked={autoGenerate} onChange={e => setAutoGenerate(e.target.checked)} color="warning" />}
                        label={<Typography color="warning.main" fontSize={14}>{autoGenerate ? 'Enabled' : 'Disabled'}</Typography>}
                      />
                    )}
                  </Box>
                  <Typography color="cyan.400" fontSize={14} mb={2}>When enabled, chat messages will be generated automatically when you paste an image</Typography>
                  <Typography color="cyan.400" fontSize={15} mb={2} sx={{ fontWeight: 600 }}>When enabled, chat messages will be generated automatically when you paste an image</Typography>
                  <Paper elevation={2} sx={{ p: 4, mt: 2, bgcolor: 'grey.900', border: '1px solid', borderColor: 'cyan.700', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
                    onClick={triggerFileInput}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        processImageFile(file, autoGenerate);
                      }
                    }}
                    title="Click to upload or drag & drop image"
                  >
                    <Box mb={2}>
                      <Typography fontSize={44} color="cyan.400" sx={{ textShadow: '0 2px 8px #0891b2' }}>
                        <span className="material-icons" style={{ fontSize: 44 }}>cloud_upload</span>
                      </Typography>
                    </Box>
                    <Typography fontWeight={700} fontSize={24} color="cyan.200" mb={1} sx={{ letterSpacing: 1 }}>Click to upload an image</Typography>
                    <Typography color="cyan.300" mb={1} fontSize={16} sx={{ fontWeight: 600 }}>Paste Screenshot or drag & drop</Typography>
                    {autoGenerate && (
                      <Typography color="warning.main" fontSize={15} fontWeight={700}>✨ Auto-generation enabled - Paste Screenshot to start immediately!</Typography>
                    )}
                    {isDragging && (
                      <Box position="absolute" top={0} left={0} right={0} bottom={0} bgcolor="warning.light" border={2} borderColor="warning.main" borderRadius={3} display="flex" alignItems="center" justifyContent="center" zIndex={10}>
                        <Typography color="warning.main" fontWeight={700} fontSize={20}>Drop image here</Typography>
                      </Box>
                    )}
                  </Paper>
                </Paper>
              )}
              {error && (
                <Paper elevation={3} sx={{ bgcolor: 'error.main', color: 'common.white', px: 2, py: 1, borderRadius: 2, mb: 2 }}>{error}</Paper>
              )}
              {screenshotUrl && (
                <>
                  <Box mb={2} sx={{ width: '100vw', maxWidth: 900, mx: 'auto' }}>
                    <img src={screenshotUrl} alt="Screenshot Preview" style={{ width: '100%', borderRadius: 16, boxShadow: '0 6px 24px rgba(6,182,212,0.18)' }} />
                  </Box>
                  {/* Button Box for main actions */}
                  <Paper elevation={3} sx={{ width: '100vw', maxWidth: 900, color: 'common.white', mx: 'auto', mb: 2, p: 2, bgcolor: '#1f2937', borderRadius: 12, boxShadow: 8, border: '2px solid', borderColor: '#0891b2', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                    <Box display="flex" alignItems="center" gap={2} width="100%" flexWrap="wrap" justifyContent="center" color="white">
                      
                      <Select
                        id="messageCount"
                        value={messageCount}
                        onChange={e => setMessageCount(Number(e.target.value))}
                        disabled={isLoading}
                        sx={{ minWidth: 60, fontSize: 10, color: 'common.white', background: 'darkblue' }}
                      >
                        {[3, 5, 7, 10].map(n => (
                          <MenuItem key={n} value={n}>{n} Messages</MenuItem>
                        ))}
                        
                      </Select>
                      <Button
                        variant="contained"
                        color="primary"
                        sx={{ minWidth: 100, fontSize: 10, fontWeight: 600 }}
                        onClick={() => handleGeneration(false, undefined, undefined, messageCount)}
                        disabled={isLoading}
                        startIcon={<span className="material-icons" style={{ fontSize: 18 }}>auto_fix_high</span>}
                      >
                        Generate
                      </Button>
                      <Button
                        variant="contained"
                        sx={{ minWidth: 80, fontSize: 10, fontWeight: 600, background: '#a21caf', color: '#fff', '&:hover': { background: '#7c1fa0' } }}
                        onClick={() => handleGeneration(true, undefined, undefined, messageCount)}
                        disabled={isLoading}
                        startIcon={<span className="material-icons" style={{ fontSize: 18 }}>sentiment_very_satisfied</span>}
                      >
                        Funnier
                      </Button>
                      {customActionEnabled && (
                        <Button
                          variant="contained"
                          sx={{ minWidth: 80, fontSize: 10, fontWeight: 600, background: '#22c55e', color: '#fff', '&:hover': { background: '#16a34a' } }}
                          onClick={() => handleGeneration(false, undefined, customButtonLabel, messageCount)}
                          disabled={isLoading}
                          startIcon={<span className="material-icons" style={{ fontSize: 18 }}>build</span>}
                        >
                          {isLoading ? '...' : customButtonLabel}
                        </Button>
                      )}
                      <Button
                        variant="contained"
                        sx={{ minWidth: 80, fontSize: 10, fontWeight: 600, background: '#38bdf8', color: '#fff', '&:hover': { background: '#0ea5e9' } }}
                        onClick={() => setShowSaveDialog(true)}
                        disabled={!responses || !responses.chatMessages || responses.chatMessages.length === 0}
                        startIcon={<span className="material-icons" style={{ fontSize: 18 }}>save</span>}
                      >
                        Save All
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        sx={{ minWidth: 80, fontSize: 10, fontWeight: 600 }}
                        onClick={resetSelection}
                        disabled={isLoading}
                        startIcon={<span className="material-icons" style={{ fontSize: 18 }}>delete</span>}
                      >
                        {/* Remove Screenshot */}
                      </Button>
                    </Box>
                  </Paper>
                  <Box mt={3}>
                    {responses && responses.chatMessages && responses.chatMessages.length > 0 ? (
                      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, width: '100vw', maxWidth: 900, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {responses.chatMessages.map((msg: any, idx: number) => (
                          <Box key={idx} component="li" sx={{ width: '100%', maxWidth: 900, bgcolor: 'cyan.900', color: 'common.white', borderRadius: 6, p: 2.5, mb: 2, boxShadow: 6, border: '2px solid', borderColor: 'cyan.700', display: 'flex', flexDirection: 'column', gap: 1, transition: 'box-shadow 0.2s', ':hover': { boxShadow: 12, borderColor: 'info.main', background: 'linear-gradient(90deg, #0891b2 0%, #22d3ee 100%)', color: 'grey.900' } }}>
                            <Typography fontSize={13} fontWeight={700} mb={1} sx={{ whiteSpace: 'pre-line', letterSpacing: 0.5 }}>{(msg as any).text || (msg as any).message || msg}</Typography>
                            <Box display="flex" gap={1} justifyContent="flex-end">
                              <Button variant="contained" color="info" size="small" sx={{ fontWeight: 700, borderRadius: 4 }} onClick={() => {
                                if (window.electronAPI && window.electronAPI.pasteToNewWorld) {
                                  window.electronAPI.pasteToNewWorld((msg as any).text || (msg as any).message || msg);
                                } else {
                                  navigator.clipboard.writeText((msg as any).text || (msg as any).message || msg);
                                }
                              }} startIcon={<span className="material-icons" style={{ fontSize: 18 }}>content_paste</span>}>Paste</Button>
                              <Button variant="contained" color="success" size="small" sx={{ fontWeight: 700, borderRadius: 4 }} onClick={() => {
                                const savedSet = {
                                  id: Date.now().toString() + '-' + Math.random().toString(36).slice(2),
                                  name: 'Saved Message',
                                  timestamp: Date.now(),
                                  messages: [{ message: (msg as any).text || (msg as any).message || msg }],
                                  screenshotUrl: screenshotUrl || undefined
                                };
                                if (window.electronAPI && window.electronAPI.saveMessageSet) {
                                  window.electronAPI.saveMessageSet(savedSet);
                                  setSaveNotification("Message saved!");
                                  setTimeout(() => setSaveNotification(undefined), 2000);
                                } else {
                                  const saved = JSON.parse(localStorage.getItem('savedMessages') || '[]');
                                  saved.push(savedSet);
                                  localStorage.setItem('savedMessages', JSON.stringify(saved));
                                  setSaveNotification("Message saved!");
                                  setTimeout(() => setSaveNotification(undefined), 2000);
                                }
                              }} startIcon={<span className="material-icons" style={{ fontSize: 18 }}>save</span>}>Save</Button>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography color="grey.400" textAlign="center" py={4} fontSize={16} fontWeight={600}>No chat messages found for this screenshot.</Typography>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Container>
          {/* Footer */}
          <Box component="footer" sx={{ position: 'fixed', minHeight: 48, py: 0.5, borderTop: 1, borderColor: 'grey.700', bgcolor: 'grey.900', mt: 'auto', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Left corner: logo and created by */}
            <Box sx={{ position: 'absolute', left: 16, bottom: 8, display: 'flex', alignItems: 'center', gap: 1 }}>
              <img src="icon.png" alt="App Icon" style={{ width: 32, height: 32, borderRadius: 6, marginRight: 8 }} />
              <Typography color="cyan.300" fontSize={13} fontWeight={600} sx={{ mr: 1 }}>
                Created by <a href="https://github.com/involvex" target="_blank" rel="noopener noreferrer" style={{ color: '#22d3ee', textDecoration: 'underline' }}>Ina Venox</a>
              </Typography>
            </Box>
            {/* Center: links and quote */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Box display="flex" gap={2} alignItems="center" justifyContent="center" mt={0.5}>
                <a href="https://newworldchat.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#22d3ee', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}><span role="img" aria-label="homepage">🌐</span> Homepage</a>
                <a href="https://www.buymeacoffee.com/involvex" target="_blank" rel="noopener noreferrer" style={{ color: '#fde68a', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}><span role="img" aria-label="coffee">☕</span> Buy me a coffee</a>
                <a href="https://github.com/involvex/new-world-chat-ai" target="_blank" rel="noopener noreferrer" style={{ color: '#f472b6', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}><span role="img" aria-label="github">🐙</span> GitHub</a>
              </Box>
              <Typography mt={0.5} color="cyan.400" fontStyle="italic" fontSize={12}>"Why walk to Everfall when you can teleport... if you have azoth!" <span role="img" aria-label="azoth">🧪</span> <span role="img" aria-label="teleport">🌀</span></Typography>
            </Box>
          </Box>
          {/* Modals */}
          {/* Settings Modal as overlay */}
          <Modal open={showSettings} onClose={() => setShowSettings(false)} sx={{ zIndex: 150 }}>
            <Box sx={{ position: 'absolute', size: '80%' }}>
              <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onConfigUpdate={() => {}}
                autoGenerate={autoGenerate}
                setAutoGenerate={setAutoGenerate}
                customButtonLabel={customButtonLabel}
                setCustomButtonLabel={setCustomButtonLabel}
                customActionEnabled={customActionEnabled}
                setCustomActionEnabled={setCustomActionEnabled}
              />
            </Box>
          </Modal>
          {/* About Modal as overlay */}
          <Modal open={showAbout} onClose={() => setShowAbout(false)} sx={{ zIndex: 150 }}>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', bgcolor: 'grey.900', borderRadius: 4, boxShadow: 24, p: 4, minWidth: 340, maxWidth: 420, width: '96vw', maxHeight: '80vh', overflowY: 'auto' }}>
              <AboutModal
                isOpen={showAbout}
                onClose={() => setShowAbout(false)}
                appVersion={latestVersion || '1.0.0'}
                author="Ina Venox"
                customButtonLabel={customButtonLabel}
                customPromptText={typeof selectedCustomPrompt === 'string' ? selectedCustomPrompt : (selectedCustomPrompt as any)?.prompt || ''}
              />
            </Box>
          </Modal>
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
            <Snackbar open={!!saveNotification} autoHideDuration={2000} onClose={() => setSaveNotification(undefined)} message={saveNotification} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} />
          )}
        </Box>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
export default App;