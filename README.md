## Code Reference

This project uses the following logic for screenshot and prompt generation:

Excerpt from `electron/main.js`, lines 569 to 593:

```
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
    // Automatically trigger prompt generation with screenshot
    mainWindow.webContents.send('auto-generate-prompts', screenshotDataUrl);
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    mainWindow.webContents.send('hotkey-screenshot-error', error.message);
  }
}, 200);
```

See `electron/main.js` for full implementation details.

## Version

Current release: **v1.5.2**


# 🎮 New World Chat AI

<div align="center">

![New World Chat AI Logo](build/icon.png)

**Generate hilarious chat messages for New World using AI! 🤖✨**

[![Version](https://img.shields.io/badge/version-1.5.1-blue.svg)](https://github.com/involvex/new-world-chat-ai/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://github.com/involvex/new-world-chat-ai)
[![GitHub Stars](https://img.shields.io/github/stars/involvex/new-world-chat-ai?style=social)](https://github.com/involvex/new-world-chat-ai/stargazers)

[📥 Download Latest Release](https://github.com/involvex/new-world-chat-ai/releases) | [🐛 Report Bug](https://github.com/involvex/new-world-chat-ai/issues) | [💡 Request Feature](https://github.com/involvex/new-world-chat-ai/issues)

</div>

---

## 🌟 What is New World Chat AI?

New World Chat AI is a powerful desktop application that uses Google's Gemini AI to generate funny, context-aware chat messages for the MMORPG **New World**. Take a screenshot of your game, and let the AI create hilarious responses that you can instantly paste into chat!

### ✨ Key Features

- 🖼️ **Screenshot Integration** - Capture your game screen and generate contextual messages
- 🎮 **Auto-Paste to Game** - One-click paste directly into New World chat
- 🤖 **AI-Powered Comedy** - Multiple humor styles from witty to absolutely unhinged
- ⌨️ **Global Hotkeys** - Control everything without switching windows
- 💾 **Message History** - Save and manage your favorite message sets
- 🎨 **Custom Prompts** - Create your own AI personalities
- 🔄 **Export & Share** - Export to Discord, text files, or clipboard
- 🌐 **System Tray** - Runs quietly in the background

---

## 🚀 Quick Start

### 1. Installation

1. **Download** the latest release from [GitHub Releases](https://github.com/involvex/new-world-chat-ai/releases)
2. **Run** the installer (`New World Chat AI Setup.exe`)
3. **Launch** the application from your desktop or Start menu

### 2. Setup

1. **Get a Gemini API Key** (free at [Google AI Studio](https://aistudio.google.com/app/apikey))
2. **Open the app** and enter your API key in settings
3. **Configure hotkeys** to your preference
4. **Start New World** and you're ready to go!

### 3. Usage

1. **Take a screenshot** using the 📸 button or `Ctrl+Shift+S`
2. **Generate messages** with the "Generate" button or `Ctrl+Enter`
3. **Paste to game** using the 🎮 button next to any message
4. **Enjoy** the chaos in New World chat! 😄

---

## 🎯 Features Overview

### 🖼️ Screenshot & AI Generation
- **Intelligent Context Analysis** - AI understands what's happening in your game
- **Multiple Humor Styles** - From casual jokes to chaotic goblin energy
- **Instant Generation** - Get 5 unique messages in seconds

### 🎮 Game Integration
- **Auto-Detection** - Automatically finds your New World window
- **Smart Pasting** - Opens chat, pastes message, and sends it
- **Clipboard Management** - Preserves your original clipboard content

### ⌨️ Productivity Features
- **Global Hotkeys** - Work from any application
  - `Ctrl+Shift+N` - Show/Hide app
  - `Ctrl+Enter` - Generate messages
  - `Ctrl+Shift+Enter` - Generate funny messages
  - `Ctrl+N` - New image
  - `Ctrl+Shift+S` - Take screenshot
- **Message History** - Never lose a great message set
- **Batch Operations** - Export multiple message sets

### 🎨 Customization
- **Custom Prompts** - Create AI personalities that match your style
- **Hotkey Configuration** - Set your preferred keyboard shortcuts
- **UI Scaling** - Responsive design that adapts to your screen

---

## 📋 System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB free space
- **Network**: Internet connection for AI generation
- **Game**: New World (obviously! 😉)
- **Brain**: Brain.exe not needed. Got the AI doing the things for you. 😅🤖
- **Hands**: 1 Hand is recommended. 😅

---

## 🛠️ Development

### Prerequisites
```bash
Node.js 18+ 
npm or yarn
```

### Setup
```bash
# Clone the repository
git clone https://github.com/involvex/new-world-chat-ai.git
cd new-world-chat-ai

# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, start Electron
npm run electron-dev
```

### Build
```bash
# Build for production
npm run build

# Create installer
npm run dist
```

### Tech Stack
- **Frontend**: React 19.1.0, TypeScript, Vite
- **Backend**: Electron 29.3.0, Node.js
- **AI**: Google Gemini AI API
- **Automation**: robotjs for game interaction
- **Build**: electron-builder

---

## 🤝 Contributing

We love contributions! Here's how you can help:

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **💻 Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **📤 Push** to the branch (`git push origin feature/amazing-feature`)
5. **🔄 Open** a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Test on Windows before submitting

---

## 📝 Changelog

### Version 1.1.2 (Latest)
- ✅ Fixed robotjs native module compatibility issues
- ✅ Enhanced auto-paste reliability with better error handling
- ✅ Added comprehensive debugging and logging
- ✅ Improved UI scaling and responsiveness
- ✅ Updated system tray integration

### Version 1.1.0
- 🎮 Added auto-paste to New World feature
- 💬 Custom prompts system
- 📝 Message history and management
- 🔄 Export and sharing capabilities

### Version 1.0.0
- 🚀 Initial release
- 🖼️ Screenshot capture and AI generation
- ⌨️ Global hotkeys
- 🔧 Basic settings and configuration

---

## 🙏 Credits & Acknowledgments

### 👨‍💻 Development Team
- **[Involvex](https://github.com/involvex)** - Lead Developer & Creator

### 🛠️ Technologies & Libraries
- **[Google Gemini AI](https://ai.google.dev/)** - AI-powered message generation
- **[Electron](https://electronjs.org/)** - Cross-platform desktop framework
- **[React](https://react.dev/)** - Modern UI framework
- **[robotjs](https://robotjs.io/)** - Native system automation
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server

### 🎮 Special Thanks
- **Amazon Game Studios** - For creating New World
- **New World Community** - For being awesome and chaotic
- **Beta Testers** - For helping make this app better
- **GitHub Community** - For feature requests and bug reports

### 🏆 Inspiration
This project was inspired by the incredible New World community and their love for creative, funny chat interactions. Special shoutout to all the players who make Aeternum a hilarious place to explore!

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**MIT License Summary:**
- ✅ Commercial use allowed
- ✅ Modification allowed  
- ✅ Distribution allowed
- ✅ Private use allowed
- ❌ No warranty provided
- ❌ No liability assumed

---

## 🔗 Links & Resources

### 📱 Project Links
- **🏠 Homepage**: [New World Chat AI](https://involvex.github.io/new-world-chat-ai/)
- **📥 Releases**: [Download Latest Version](https://github.com/involvex/new-world-chat-ai/releases)
- **🐛 Issues**: [Report Bugs & Request Features](https://github.com/involvex/new-world-chat-ai/issues)

### 🔧 Developer Resources
- **📚 Documentation**: Coming soon!
- **🧪 Test Builds**: [CI/CD Pipeline](https://github.com/involvex/new-world-chat-ai/actions)

### 🎮 Game Resources
- **🌍 New World Official**: [Play New World](https://www.newworld.com/)
- **🤖 Google AI Studio**: [Get API Key](https://aistudio.google.com/app/apikey)

---

<div align="center">

**Made with ❤️ for the New World community**

⭐ **Star this repo if you found it useful!** ⭐

[🔝 Back to Top](#-new-world-chat-ai)

</div>
