const electron = require('electron');
const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, dialog, shell, clipboard, desktopCapturer, screen } = electron;
const { join } = require('path');
const fs = require('fs');
const { exec } = require('child_process');


// Import enhanced screenshot manager
const ScreenshotManager = require('./screenshot-fix');

// Initialize enhanced screenshot manager
let screenshotManager;

// Handle robotjs with error handling for production builds
let robot;
try {
  robot = require('robotjs');
  console.log('RobotJS loaded successfully');
} catch (error) {
  console.warn('RobotJS failed to load:', error.message);
  console.warn('Screenshot and automation features will be disabled');
  // Create a mock robot object to prevent crashes
  robot = {
    screen: {
      capture: () => {
        throw new Error('RobotJS not available - screenshot functionality disabled');
      }
    },
    typeString: () => {
      console.warn('RobotJS not available - typing functionality disabled');
    },
    keyTap: () => {
      console.warn('RobotJS not available - key automation disabled');
    },
    getMousePos: () => {
      console.warn('RobotJS not available - mouse position disabled');
      return { x: 0, y: 0 };
    },
    getScreenSize: () => {
      console.warn('RobotJS not available - screen size disabled');
      return { width: 1920, height: 1080 };
    }
  };
}

// __dirname is automatically available in CommonJS
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let tray;

// Set app icon for Windows and Linux
if (process.platform === 'win32' || process.platform === 'linux') {
  app.setAppUserModelId('com.inavenox.newworldchatai');
  try {
    app.setIcon && app.setIcon(join(__dirname, '../build/icon.png'));
  } catch (error) {
    console.warn('Failed to set app icon:', error.message);
  }
}
let settingsWindow;

// Configuration file path
const configPath = join(app.getPath('userData'), 'config.json');
const messageHistoryPath = join(app.getPath('userData'), 'message-history.json');

// Default configuration
const defaultConfig = {
  hotkeys: {
    showHide: 'CommandOrControl+Shift+N',
    generate: 'CommandOrControl+Enter',
    generateFunny: 'CommandOrControl+Shift+Enter',
    newImage: 'CommandOrControl+N',
    screenshot: 'CommandOrControl+Shift+S'
  },
  customPrompts: [
    {
      id: 'default',
      name: 'Default New World Chat',
      prompt: 'You are a hilarious AI assistant for the MMORPG New World. Your task is to generate funny, context-aware chat messages full of stupid jokes that a player could use. Based on the provided screenshot, generate 5 distinct chat messages. The messages should sound like a real player who isn\'t very serious and loves to joke around.',
      isDefault: true
    },
    {
      id: 'funny',
      name: 'Unhinged Comedy',
      prompt: 'You are an absolutely UNHINGED AI comedian for the MMORPG New World. Your goal is to generate the most absurd, nonsensical, and stupidly funny chat messages imaginable based on the screenshot. Go completely over the top. Think chaotic goblin energy. The player wants to spam chat with pure nonsense.',
      isDefault: true
    }
  ],
  selectedPrompt: 'default',
  startMinimized: false,
  showInTaskbar: true,
  geminiApiKey: '' // Optional API key, falls back to default if empty
};

// Load or create configuration
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return { ...defaultConfig, ...JSON.parse(configData) };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return defaultConfig;
}

// Save configuration
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

// Load or create message history
function loadMessageHistory() {
  try {
    if (fs.existsSync(messageHistoryPath)) {
      const historyData = fs.readFileSync(messageHistoryPath, 'utf8');
      return JSON.parse(historyData);
    }
  } catch (error) {
    console.error('Error loading message history:', error);
  }
  return { savedSets: [], lastBackup: null };
}

// Save message history
function saveMessageHistory(history) {
  try {
    fs.writeFileSync(messageHistoryPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error saving message history:', error);
  }
}

let config = loadConfig();

// Enhanced screenshot functionality with robust monitor detection
async function captureScreenshot() {
  try {
    // Initialize screenshot manager if not already done
    if (!screenshotManager) {
      console.log('Initializing enhanced screenshot manager...');
      screenshotManager = new ScreenshotManager();
      const initialized = await screenshotManager.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize enhanced screenshot manager');
      }
    }
    
    // Capture screenshot using enhanced manager
    const dataUrl = await screenshotManager.captureScreenshot();
    return dataUrl;
    
  } catch (error) {

  console.log('Using legacy screenshot capture...');
  
  try {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { 
        width: Math.max(1280, primaryDisplay.size.width), 
        height: Math.max(720, primaryDisplay.size.height) 
      },
      fetchWindowIcons: false
    });

    if (sources.length === 0) {
      throw new Error('No screen sources available from desktopCapturer');
    }

    // Simple source selection for legacy method
    let targetSource = sources[0];
    
    if (sources.length > 1) {
      // Try to find primary display source
      const primarySource = sources.find(source => {
        const sourceDisplayId = parseInt(source.display_id);
        return sourceDisplayId === primaryDisplay.id;
      });
      
      if (primarySource) {
        targetSource = primarySource;
      }
    }
    
    const screenshot = targetSource.thumbnail;
    if (screenshot.isEmpty()) {
      throw new Error('Captured screenshot is empty');
    }
    
    return screenshot.toDataURL();
    
  } catch (error) {
    console.error('Legacy screenshot method failed:', error);
    throw error;
  }
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 400,
    minHeight: 500,
    show: !config.startMinimized,
    skipTaskbar: !config.showInTaskbar,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: true, // Keep security enabled but allow local resources
      allowRunningInsecureContent: false,
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Handle window close to minimize to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    parent: mainWindow,
    modal: true,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  });

  // Load settings page
  const settingsContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Settings - New World Chat AI</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #1f2937; 
          color: #f3f4f6;
        }
        .container { max-width: 500px; margin: 0 auto; }
        h1 { color: #06b6d4; text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #3b82f6; border-bottom: 2px solid #374151; padding-bottom: 10px; }
        .hotkey-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; }
        input, select, textarea { 
          width: 100%; 
          padding: 8px 12px; 
          border: 1px solid #4b5563; 
          border-radius: 6px; 
          background: #374151; 
          color: #f3f4f6;
          box-sizing: border-box;
        }
        textarea { height: 100px; resize: vertical; }
        button { 
          background: #06b6d4; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 6px; 
          cursor: pointer; 
          margin-right: 10px;
        }
        button:hover { background: #0891b2; }
        button.secondary { background: #6b7280; }
        button.secondary:hover { background: #4b5563; }
        .buttons { text-align: center; margin-top: 30px; }
        .prompt-item { border: 1px solid #4b5563; border-radius: 6px; padding: 15px; margin-bottom: 10px; }
        .prompt-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .prompt-name { font-weight: bold; color: #06b6d4; }
        .prompt-actions { margin-left: auto; }
        .checkbox { width: auto; margin-right: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚙️ Settings</h1>
        
        <div class="section">
          <h2>🔥 Hotkeys</h2>
          <div class="hotkey-group">
            <label>Show/Hide App:</label>
            <input type="text" id="hotkey-showHide" placeholder="CommandOrControl+Shift+N">
          </div>
          <div class="hotkey-group">
            <label>Generate Messages:</label>
            <input type="text" id="hotkey-generate" placeholder="CommandOrControl+Enter">
          </div>
          <div class="hotkey-group">
            <label>Generate Funny Messages:</label>
            <input type="text" id="hotkey-generateFunny" placeholder="CommandOrControl+Shift+Enter">
          </div>
          <div class="hotkey-group">
            <label>New Image:</label>
            <input type="text" id="hotkey-newImage" placeholder="CommandOrControl+N">
          </div>
        </div>

        <div class="section">
          <h2>💬 Custom Prompts</h2>
          <div id="prompt-list"></div>
          <button onclick="addNewPrompt()">Add New Prompt</button>
        </div>

        <div class="section">
          <h2>🔧 App Settings</h2>
          <label>
            <input type="checkbox" id="startMinimized" class="checkbox">
            Start minimized to system tray
          </label>
          <br><br>
          <label>
            <input type="checkbox" id="showInTaskbar" class="checkbox">
            Show in taskbar
          </label>
        </div>

        <div class="buttons">
          <button onclick="saveSettings()">Save Settings</button>
          <button class="secondary" onclick="resetSettings()">Reset to Default</button>
          <button class="secondary" onclick="closeSettings()">Cancel</button>
        </div>
      </div>
      <script src="settings.js"></script>
    </body>
    </html>
  `;

  settingsWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(settingsContent));
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  try {
    // Create tray icon - handle both dev and production paths
    let trayIconPath = join(__dirname, '../build/icon.png');
    
    // If the icon doesn't exist at the default path, try the production path
    if (!fs.existsSync(trayIconPath)) {
      trayIconPath = join(__dirname, '../../build/icon.png');
    }
    
    console.log('Creating tray with icon:', trayIconPath);
    
    if (!fs.existsSync(trayIconPath)) {
      console.error('Tray icon file not found at any expected location');
      return;
    }
    
    tray = new Tray(trayIconPath);
    console.log('System tray created successfully');
  } catch (error) {
    console.error('Failed to create system tray:', error.message);
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show New World Chat AI',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Open Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          // Send event to open settings modal
          mainWindow.webContents.send('open-settings-from-tray');
        } else {
          createWindow();
          // Wait for window to load then open settings
          mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('open-settings-from-tray');
          });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'About',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          // Send event to open about modal
          mainWindow.webContents.send('open-about-from-tray');
        } else {
          createWindow();
          // Wait for window to load then open about
          mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('open-about-from-tray');
          });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('New World Chat AI');
  tray.setContextMenu(contextMenu);
  
  // Double click to show/hide
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

function registerGlobalShortcuts() {
  // Clear existing shortcuts
  globalShortcut.unregisterAll();
  
  // Register show/hide shortcut
  globalShortcut.register(config.hotkeys.showHide, () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });

  // Register generate shortcut
  globalShortcut.register(config.hotkeys.generate, () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.webContents.send('hotkey-generate');
    }
  });

  // Register generate funny shortcut
  globalShortcut.register(config.hotkeys.generateFunny, () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.webContents.send('hotkey-generate-funny');
    }
  });

  // Register new image shortcut
  globalShortcut.register(config.hotkeys.newImage, () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.webContents.send('hotkey-new-image');
    }
  });

  // Register screenshot shortcut
  globalShortcut.register(config.hotkeys.screenshot, async () => {
    console.log('Screenshot hotkey pressed!');
    
    try {
      // Show and focus the window first
      if (mainWindow) {
        console.log('Window exists, showing and focusing...');
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.focus();
        
        // Small delay to ensure window is focused before taking screenshot
        setTimeout(async () => {
          try {
            console.log('Taking screenshot...');
            const screenshotDataUrl = await captureScreenshot();
            console.log('Screenshot captured successfully, sending to renderer...');
            // Send screenshot to renderer process
            mainWindow.webContents.send('hotkey-screenshot-captured', screenshotDataUrl);
          } catch (error) {
            console.error('Screenshot capture failed:', error);
            mainWindow.webContents.send('hotkey-screenshot-error', error.message);
          }
        }, 200);
      } else {
        console.log('No window exists, creating one...');
        createWindow();
        // Wait for window to be created and then take screenshot
        setTimeout(async () => {
          try {
            console.log('Taking screenshot after window creation...');
            const screenshotDataUrl = await captureScreenshot();
            console.log('Screenshot captured successfully, sending to renderer...');
            mainWindow.webContents.send('hotkey-screenshot-captured', screenshotDataUrl);
          } catch (error) {
            console.error('Screenshot capture failed:', error);
            mainWindow.webContents.send('hotkey-screenshot-error', error.message);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error in screenshot hotkey:', error);
    }
  });
}

// IPC handlers
ipcMain.handle('get-config', () => config);

ipcMain.handle('save-config', (event, newConfig) => {
  config = { ...config, ...newConfig };
  saveConfig(config);
  registerGlobalShortcuts(); // Re-register shortcuts with new config
  return config;
});

ipcMain.handle('get-custom-prompts', () => config.customPrompts);

ipcMain.handle('save-custom-prompt', (event, prompt) => {
  const existingIndex = config.customPrompts.findIndex(p => p.id === prompt.id);
  if (existingIndex >= 0) {
    config.customPrompts[existingIndex] = prompt;
  } else {
    config.customPrompts.push(prompt);
  }
  saveConfig(config);
  return config.customPrompts;
});

ipcMain.handle('delete-custom-prompt', (event, promptId) => {
  config.customPrompts = config.customPrompts.filter(p => p.id !== promptId || p.isDefault);
  saveConfig(config);
  return config.customPrompts;
});

// API Key handlers
ipcMain.handle('get-gemini-api-key', () => {
  return config.geminiApiKey || '';
});

ipcMain.handle('save-gemini-api-key', (event, apiKey) => {
  config.geminiApiKey = apiKey;
  saveConfig(config);
  return true;
});

// External links
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
  } catch (error) {
    console.error('Failed to open external URL:', error);
    throw error;
  }
});

// App control
ipcMain.handle('quit-app', () => {
  app.isQuiting = true;
  app.quit();
});

ipcMain.handle('take-screenshot', async () => {
  try {
    const screenshotDataUrl = await captureScreenshot();
    return { success: true, dataUrl: screenshotDataUrl };
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return { success: false, error: error.message };
  }
});

// Auto-paste to New World
ipcMain.handle('paste-to-new-world', async (event, message) => {
  console.log('Auto-paste requested for message:', message.substring(0, 50) + '...');
  
  try {
    // Store current clipboard content
    const originalClipboard = clipboard.readText();
    console.log('Original clipboard saved');
    
    // Set message to clipboard
    clipboard.writeText(message);
    console.log('Message set to clipboard');
    
    // Try to find and focus New World window
    console.log('Checking if New World is running...');
    const isRunning = await new Promise((resolve, reject) => {
      exec('tasklist /FI "IMAGENAME eq NewWorld.exe" /FO CSV', (error, stdout) => {
        if (error) {
          console.error('Error checking New World process:', error);
          reject(error);
          return;
        }
        const lines = stdout.split('\n');
        const found = lines.some(line => line.includes('NewWorld.exe'));
        console.log('New World running:', found);
        resolve(found);
      });
    });
    
    if (!isRunning) {
      throw new Error('New World is not running');
    }
    
    console.log('Attempting to focus New World window...');
    // Find New World window and activate it
    await new Promise((resolve) => {
      exec('powershell -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate(\\"New World\\")"', (error) => {
        if (error) {
          console.warn('Could not focus New World window:', error);
        } else {
          console.log('New World window focused successfully');
        }
        resolve();
      });
    });
    
    // Small delay to ensure window is focused
    console.log('Starting automation sequence...');
    await new Promise((resolve) => {
      setTimeout(() => {
        try {
          console.log('Step 1: Opening chat with Enter key...');
          robot.keyTap('enter'); // Open chat
          
          setTimeout(() => {
            console.log('Step 2: Pasting with Ctrl+V...');
            robot.keyTap('v', ['control']); // Paste (use array for modifiers)
            
            setTimeout(() => {
              console.log('Step 3: Sending message with Enter key...');
              robot.keyTap('enter'); // Send message
              
              // Restore original clipboard
              clipboard.writeText(originalClipboard);
              console.log('Clipboard restored, automation complete');
              resolve();
            }, 150);
          }, 300);
        } catch (robotError) {
          console.error('Robot automation error:', robotError);
          // Restore clipboard even if robot fails
          clipboard.writeText(originalClipboard);
          resolve();
        }
      }, 800);
    });
    
    return { success: true };
  } catch (error) {
    console.error('Auto-paste failed:', error);
    return { success: false, error: error.message };
  }
});

// Message history IPC handlers
ipcMain.handle('get-message-history', () => {
  return loadMessageHistory();
});

ipcMain.handle('save-message-set', (event, messageSet) => {
  const history = loadMessageHistory();
  
  // Add or update message set
  const existingIndex = history.savedSets.findIndex(set => set.id === messageSet.id);
  if (existingIndex >= 0) {
    history.savedSets[existingIndex] = messageSet;
  } else {
    history.savedSets.unshift(messageSet); // Add to beginning
  }
  
  // Keep only last 100 saved sets to prevent bloat
  if (history.savedSets.length > 100) {
    history.savedSets = history.savedSets.slice(0, 100);
  }
  
  saveMessageHistory(history);
  return history;
});

ipcMain.handle('delete-message-set', (event, setId) => {
  const history = loadMessageHistory();
  history.savedSets = history.savedSets.filter(set => set.id !== setId);
  saveMessageHistory(history);
  return history;
});

ipcMain.handle('export-messages', async (event, messageSet) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Messages',
      defaultPath: `${messageSet.name.replace(/[^a-z0-9]/gi, '_')}_messages.txt`,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePath) {
      let content;
      if (filePath.endsWith('.json')) {
        content = JSON.stringify(messageSet, null, 2);
      } else {
        content = `${messageSet.name}\n`;
        content += `Generated: ${new Date(messageSet.timestamp).toLocaleString()}\n`;
        content += `\n${'='.repeat(50)}\n\n`;
        messageSet.messages.forEach((msg, index) => {
          content += `${index + 1}. ${msg.message}\n\n`;
        });
      }
      
      fs.writeFileSync(filePath, content);
      
      // Show success and option to open file location
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Export Successful',
        message: 'Messages exported successfully!',
        detail: `Saved to: ${filePath}`,
        buttons: ['OK', 'Open File Location'],
        defaultId: 0
      });
      
      if (result.response === 1) {
        shell.showItemInFolder(filePath);
      }
      
      return { success: true, filePath };
    }
    
    return { success: false, cancelled: true };
  } catch (error) {
    console.error('Error exporting messages:', error);
    dialog.showErrorBox('Export Failed', `Failed to export messages: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('share-messages', async (event, messageSet, shareType) => {
  try {
    let content;
    
    if (shareType === 'clipboard') {
      // Simple text format for clipboard
      content = messageSet.messages.map(msg => msg.message).join('\n\n');
      clipboard.writeText(content);
      
      return { success: true, type: 'clipboard' };
    } else if (shareType === 'discord') {
      // Discord-friendly format with code blocks
      content = `**${messageSet.name}**\n`;
      content += `*Generated on ${new Date(messageSet.timestamp).toLocaleDateString()}*\n\n`;
      messageSet.messages.forEach((msg, index) => {
        content += `**${index + 1}.** \`${msg.message}\`\n`;
      });
      
      clipboard.writeText(content);
      return { success: true, type: 'discord' };
    }
    
    return { success: false, error: 'Unknown share type' };
  } catch (error) {
    console.error('Error sharing messages:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup-message-history', async () => {
  try {
    const history = loadMessageHistory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Backup Message History',
      defaultPath: `new-world-chat-backup-${timestamp}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePath) {
      const backupData = {
        ...history,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      
      // Update last backup timestamp
      history.lastBackup = Date.now();
      saveMessageHistory(history);
      
      return { success: true, filePath };
    }
    
    return { success: false, cancelled: true };
  } catch (error) {
    console.error('Error backing up message history:', error);
    return { success: false, error: error.message };
  }
});

// Test robotjs functionality
ipcMain.handle('test-robotjs', async () => {
  try {
    console.log('Testing robotjs functionality...');
    
    // Get mouse position as a basic test
    const mousePos = robot.getMousePos();
    console.log('Mouse position:', mousePos);
    
    // Get screen size
    const screenSize = robot.getScreenSize();
    console.log('Screen size:', screenSize);
    
    // Test a simple key tap (space - should be safe)
    console.log('Testing key tap (space)...');
    robot.keyTap('space');
    
    return { 
      success: true, 
      mousePos, 
      screenSize,
      message: 'robotjs is working correctly'
    };
  } catch (error) {
    console.error('robotjs test failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// Monitor diagnostics and information
ipcMain.handle('get-monitor-info', async () => {
  try {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    
    // Get desktop capturer sources for comparison
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 },
      fetchWindowIcons: false
    });
    
    return {
      success: true,
      displays: displays.map(display => ({
        id: display.id,
        bounds: display.bounds,
        workArea: display.workArea,
        size: display.size,
        scaleFactor: display.scaleFactor,
        rotation: display.rotation,
        colorDepth: display.colorDepth,
        colorSpace: display.colorSpace,
        isPrimary: display.id === primaryDisplay.id,
        internal: display.internal || false
      })),
      primaryDisplayId: primaryDisplay.id,
      sources: sources.map(source => ({
        id: source.id,
        name: source.name,
        display_id: source.display_id,
        thumbnailSize: source.thumbnail ? source.thumbnail.getSize() : null
      }))
    };
  } catch (error) {
    console.error('Failed to get monitor info:', error);
    return { success: false, error: error.message };
  }
});

// Test screenshot capture with specific monitor
ipcMain.handle('test-monitor-screenshot', async (event, sourceId) => {
  try {
    console.log('Testing screenshot for source ID:', sourceId);
    
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 300, height: 200 },
      fetchWindowIcons: false
    });
    
    const targetSource = sources.find(source => source.id === sourceId);
    if (!targetSource) {
      throw new Error(`Source with ID ${sourceId} not found`);
    }
    
    const screenshot = targetSource.thumbnail;
    const screenshotDataUrl = screenshot.toDataURL();
    
    return {
      success: true,
      dataUrl: screenshotDataUrl,
      source: {
        id: targetSource.id,
        name: targetSource.name,
        display_id: targetSource.display_id
      }
    };
  } catch (error) {
    console.error('Test monitor screenshot failed:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced HDR and monitor compatibility settings
console.log('=== CONFIGURING ELECTRON FOR MONITOR COMPATIBILITY ===');
app.commandLine.appendSwitch('disable-hdr');
app.commandLine.appendSwitch('disable-direct-composition');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Monitor detection diagnostics
function logMonitorSetup() {
  try {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    
    console.log('=== MONITOR SETUP DETECTED ===');
    console.log(`Total displays: ${displays.length}`);
    console.log(`Primary display: ${primary.id} (${primary.size.width}x${primary.size.height})`);
    
    displays.forEach((display, index) => {
      console.log(`Monitor ${index + 1}:`, {
        id: display.id,
        resolution: `${display.size.width}x${display.size.height}`,
        position: `(${display.bounds.x}, ${display.bounds.y})`,
        scaleFactor: display.scaleFactor,
        isPrimary: display.id === primary.id,
        rotation: display.rotation,
        colorDepth: display.colorDepth
      });
    });
  } catch (error) {
    console.error('Failed to log monitor setup:', error);
  }
}

app.whenReady().then(async () => {
  console.log('=== ELECTRON APP READY ===');
  
  // Log monitor setup for diagnostics
  logMonitorSetup();
  
  // Initialize enhanced screenshot manager
  try {
    console.log('Initializing enhanced screenshot manager on startup...');
    screenshotManager = new ScreenshotManager();
    const initialized = await screenshotManager.initialize();
    if (initialized) {
      console.log('✅ Enhanced screenshot manager initialized successfully');
    } else {
      console.warn('⚠️ Enhanced screenshot manager initialization failed, will use fallback methods');
    }
  } catch (error) {
    console.error('Screenshot manager initialization error:', error);
    console.warn('Will use fallback screenshot methods when needed');
  }
  
  createWindow();
  createTray();
  registerGlobalShortcuts();
  
  // Install devtools extensions in development mode
  if (isDev) {
    try {
      console.log('Installing devtools extensions...');
      
      // Install React Developer Tools
      const reactDevToolsName = await installExtension(REACT_DEVELOPER_TOOLS);
      console.log(`Added Extension: ${reactDevToolsName}`);
      
      // Install Redux DevTools
      const reduxDevToolsName = await installExtension(REDUX_DEVTOOLS);
      console.log(`Added Extension: ${reduxDevToolsName}`);
      
    } catch (err) {
      console.log('An error occurred installing devtools extensions:', err);
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit the app, just hide to tray
    if (mainWindow) {
      mainWindow = null;
    }
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Enhanced screenshot diagnostics
ipcMain.handle('get-screenshot-diagnostics', async () => {
  try {
    if (!screenshotManager) {
      screenshotManager = new ScreenshotManager();
      await screenshotManager.initialize();
    }
    
    const diagnostics = screenshotManager.getDiagnostics();
    return { success: true, diagnostics };
  } catch (error) {
    console.error('Failed to get screenshot diagnostics:', error);
    return { success: false, error: error.message };
  }
});

// Test specific screenshot source
ipcMain.handle('test-screenshot-source', async (event, sourceId) => {
  try {
    if (!screenshotManager) {
      screenshotManager = new ScreenshotManager();
      await screenshotManager.initialize();
    }
    
    const result = await screenshotManager.testCapture(sourceId);
    return result;
  } catch (error) {
    console.error('Failed to test screenshot source:', error);
    return { success: false, error: error.message };
  }
});

// Reinitialize screenshot manager
ipcMain.handle('reinitialize-screenshot-manager', async () => {
  try {
    console.log('Reinitializing screenshot manager...');
    screenshotManager = new ScreenshotManager();
    const initialized = await screenshotManager.initialize();
    
    return { 
      success: initialized, 
      message: initialized ? 'Screenshot manager reinitialized successfully' : 'Failed to reinitialize screenshot manager'
    };
  } catch (error) {
    console.error('Failed to reinitialize screenshot manager:', error);
    return { success: false, error: error.message };
  }
});

// Add specific IPC handler for manual monitor selection
ipcMain.handle('force-monitor-selection', async (event, displayId) => {
  try {
    console.log('Forcing monitor selection for display ID:', displayId);
    
    // Get all available sources
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 300, height: 200 },
      fetchWindowIcons: false
    });
    
    // Find source matching the requested display
    const targetSource = sources.find(source => {
      const sourceDisplayId = parseInt(source.display_id);
      return sourceDisplayId === displayId;
    });
    
    if (!targetSource) {
      // If no exact match, look for "entire screen" source that might capture all displays
      const entireScreenSource = sources.find(source =>
        /entire|whole|all|complete|gesamter/i.test(source.name)
      );
      
      if (entireScreenSource) {
        console.log('Using entire screen source for display', displayId);
        return {
          success: true,
          source: entireScreenSource,
          note: 'Using entire screen capture (covers all displays)'
        };
      }
      
      return {
        success: false,
        error: `No source found for display ${displayId}`,
        availableSources: sources.map(s => ({
          id: s.id,
          name: s.name,
          display_id: s.display_id
        }))
      };
    }
    
    console.log('Found source for display', displayId, ':', targetSource.name);
    return {
      success: true,
      source: {
        id: targetSource.id,
        name: targetSource.name,
        display_id: targetSource.display_id
      }
    };
    
  } catch (error) {
    console.error('Failed to force monitor selection:', error);
    return { success: false, error: error.message };
  }
});

// Add handler to get detailed monitor/source mapping
ipcMain.handle('get-monitor-source-mapping', async () => {
  try {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 150, height: 150 },
      fetchWindowIcons: false
    });
    
    // Create mapping between displays and sources
    const mapping = displays.map(display => {
      const matchingSources = sources.filter(source => {
        const sourceDisplayId = parseInt(source.display_id);
        return sourceDisplayId === display.id;
      });
      
      return {
        display: {
          id: display.id,
          bounds: display.bounds,
          size: display.size,
          isPrimary: display.id === primaryDisplay.id,
          scaleFactor: display.scaleFactor,
          colorDepth: display.colorDepth,
          colorSpace: display.colorSpace
        },
        sources: matchingSources.map(source => ({
          id: source.id,
          name: source.name,
          display_id: source.display_id
        })),
        hasDirectSource: matchingSources.length > 0
      };
    });
    
    // Also include sources that don't match any specific display (like "Entire screen")
    const unmatchedSources = sources.filter(source => {
      const sourceDisplayId = parseInt(source.display_id);
      return !displays.some(display => display.id === sourceDisplayId);
    });
    
    return {
      success: true,
      mapping,
      unmatchedSources: unmatchedSources.map(source => ({
        id: source.id,
        name: source.name,
        display_id: source.display_id
      })),
      totalDisplays: displays.length,
      totalSources: sources.length,
      primaryDisplayId: primaryDisplay.id
    };
    
  } catch (error) {
    console.error('Failed to get monitor-source mapping:', error);
    return { success: false, error: error.message };
  }
});

// Enhanced screenshot diagnostics with multiple detection methods
ipcMain.handle('test-comprehensive-source-detection', async () => {
  try {
    console.log('=== COMPREHENSIVE SOURCE DETECTION TEST ===');
    
    const displays = screen.getAllDisplays();
    const results = {
      displays: displays.length,
      displayInfo: displays.map(d => ({ id: d.id, bounds: d.bounds, isPrimary: d.id === screen.getPrimaryDisplay().id })),
      detectionResults: []
    };

    // Method 1: Standard
    try {
      const sources1 = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 300, height: 200 },
        fetchWindowIcons: false
      });
      results.detectionResults.push({
        method: 'Standard (300x200)',
        sourceCount: sources1.length,
        sources: sources1.map(s => ({ id: s.id, name: s.name, display_id: s.display_id }))
      });
    } catch (error) {
      results.detectionResults.push({ method: 'Standard', error: error.message });
    }

    // Method 2: High resolution
    try {
      const sources2 = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false
      });
      results.detectionResults.push({
        method: 'High-res (1920x1080)',
        sourceCount: sources2.length,
        sources: sources2.map(s => ({ id: s.id, name: s.name, display_id: s.display_id }))
      });
    } catch (error) {
      results.detectionResults.push({ method: 'High-res', error: error.message });
    }

    // Method 3: Very small thumbnails
    try {
      const sources3 = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 64, height: 64 },
        fetchWindowIcons: false
      });
      results.detectionResults.push({
        method: 'Small (64x64)',
        sourceCount: sources3.length,
        sources: sources3.map(s => ({ id: s.id, name: s.name, display_id: s.display_id }))
      });
    } catch (error) {
      results.detectionResults.push({ method: 'Small', error: error.message });
    }

    // Method 4: Mixed types
    try {
      const sources4 = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 300, height: 200 },
        fetchWindowIcons: false
      });
      const screenOnly = sources4.filter(s => s.id.startsWith('screen:'));
      results.detectionResults.push({
        method: 'Mixed types (screen only)',
        sourceCount: screenOnly.length,
        totalCount: sources4.length,
        sources: screenOnly.map(s => ({ id: s.id, name: s.name, display_id: s.display_id }))
      });
    } catch (error) {
      results.detectionResults.push({ method: 'Mixed types', error: error.message });
    }

    // Method 5: Zero thumbnail size (might get more sources)
    try {
      const sources5 = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 },
        fetchWindowIcons: false
      });
      results.detectionResults.push({
        method: 'No thumbnail (0x0)',
        sourceCount: sources5.length,
        sources: sources5.map(s => ({ id: s.id, name: s.name, display_id: s.display_id }))
      });
    } catch (error) {
      results.detectionResults.push({ method: 'No thumbnail', error: error.message });
    }

    return { success: true, results };
  } catch (error) {
    console.error('Comprehensive source detection failed:', error);
    return { success: false, error: error.message };
  }
});

// Test actual screenshot capture dimensions
ipcMain.handle('test-full-resolution-capture', async () => {
  try {
    console.log('=== TESTING FULL RESOLUTION CAPTURE ===');
    
    const displays = screen.getAllDisplays();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 4000, height: 2000 }, // Large size to get full resolution
      fetchWindowIcons: false
    });
    
    if (sources.length === 0) {
      return { success: false, error: 'No sources available' };
    }
    
    const source = sources[0];
    const screenshot = source.thumbnail;
    const size = screenshot.getSize();
    
    // Calculate expected dimensions for dual monitor setup
    const totalWidth = displays.reduce((sum, display) => sum + display.size.width, 0);
    const maxHeight = Math.max(...displays.map(display => display.size.height));
    
    console.log('Screenshot analysis:');
    console.log('- Source name:', source.name);
    console.log('- Actual screenshot size:', size);
    console.log('- Display 1:', displays[0].size);
    console.log('- Display 2:', displays[1] ? displays[1].size : 'N/A');
    console.log('- Expected dual monitor size:', { width: totalWidth, height: maxHeight });
    console.log('- Aspect ratio actual:', (size.width / size.height).toFixed(2));
    console.log('- Aspect ratio expected dual:', (totalWidth / maxHeight).toFixed(2));
    
    const capturesBothMonitors = size.width >= totalWidth * 0.8; // Allow some scaling
    
    return {
      success: true,
      source: {
        name: source.name,
        display_id: source.display_id
      },
      actualSize: size,
      expectedSize: { width: totalWidth, height: maxHeight },
      displays: displays.map(d => ({ id: d.id, size: d.size, bounds: d.bounds })),
      capturesBothMonitors,
      aspectRatioActual: size.width / size.height,
      aspectRatioExpected: totalWidth / maxHeight
    };
  } catch (error) {
    console.error('Full resolution capture test failed:', error);
    return { success: false, error: error.message };
  }
});

// Capture screenshot from specific display
ipcMain.handle('capture-display-screenshot', async (event, displayId) => {
  try {
    console.log('Capturing screenshot for display:', displayId);
    
    if (!screenshotManager) {
      screenshotManager = new ScreenshotManager();
      await screenshotManager.initialize();
    }
    
    const dataUrl = await screenshotManager.captureScreenshot({ displayId });
    
    return {
      success: true,
      dataUrl,
      displayId,
      message: `Screenshot captured for display ${displayId}`
    };
  } catch (error) {
    console.error('Display-specific screenshot failed:', error);
    return { success: false, error: error.message, displayId };
  }
});

// Get all available sources including virtual ones
ipcMain.handle('get-all-screenshot-sources', async () => {
  try {
    if (!screenshotManager) {
      screenshotManager = new ScreenshotManager();
      await screenshotManager.initialize();
    }
    
    const allSources = screenshotManager.monitorDetector.getAllSources();
    const displays = screen.getAllDisplays();
    
    return {
      success: true,
      sources: allSources.map(source => ({
        id: source.id,
        name: source.name,
        display_id: source.display_id,
        isVirtual: source.isVirtual || false,
        targetDisplay: source.targetDisplay ? {
          id: source.targetDisplay.id,
          bounds: source.targetDisplay.bounds,
          size: source.targetDisplay.size
        } : null
      })),
      displays: displays.map(display => ({
        id: display.id,
        bounds: display.bounds,
        size: display.size,
        isPrimary: display.id === screen.getPrimaryDisplay().id
      }))
    };
  } catch (error) {
    console.error('Failed to get all screenshot sources:', error);
    return { success: false, error: error.message };
  }
});



