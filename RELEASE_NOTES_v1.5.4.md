# New World Chat AI v1.5.4 Release Notes

## 🆕 What's New in 1.5.4

### Major Features & Improvements
- **PowerShell Screenshot Script Bundling**
  - The `fokusnewworldscreenshot.ps1` script is now reliably included in all Electron builds and installers.
  - Electron production builds now correctly locate and execute the PowerShell script for advanced screenshot capture on Windows.
- **Robust Screenshot Handling**
  - Improved fallback logic for screenshot capture: if the PowerShell script fails, Electron's built-in screenshot and enhanced manager are used automatically.
  - Added detailed logging for screenshot path resolution and errors in production builds.
- **Build & Packaging Enhancements**
  - Updated `electron-builder` configuration to ensure all required resources (scripts, icons) are bundled for all platforms.
  - Improved cross-platform asset handling for Windows, macOS, and Linux.
- **Hotkey & Automation Reliability**
  - Global hotkeys and auto-paste features tested and validated for both development and production environments.
  - Clipboard management and game window detection improved for seamless chat automation.
- **Documentation Updates**
  - README.md updated to reflect new features, setup steps, and troubleshooting tips for screenshot and automation features.
  - Release notes and changelog expanded for transparency.

### Bug Fixes
- Fixed: PowerShell screenshot script not found in packaged builds.
- Fixed: Asset path resolution issues in production (icons, scripts).
- Fixed: Occasional failures in auto-paste and screenshot hotkeys.
- Fixed: Minor UI inconsistencies and typos in prompts/settings.

### Developer & User Experience
- Improved error messages and logging for easier troubleshooting.
- Enhanced onboarding instructions for API key setup and game integration.
- Validated installer and portable builds for Windows 10/11.

## 🛠️ How to Update
1. Download the latest installer or portable executable from the [releases page](https://github.com/involvex/new-world-chat-ai/releases).
2. Run the installer or portable app as usual.
3. For advanced screenshot features, ensure you have PowerShell available (default on Windows 10/11).

## ⚠️ Known Issues
- No major issues reported for 1.5.4. If you encounter problems, please report them on GitHub Issues.

## 📚 Resources
- [README.md](../README.md) for setup, usage, and troubleshooting
- [INSTALLATION.md](../release/INSTALLATION.md) for step-by-step install instructions

---
**Thank you for using New World Chat AI!**

For feedback, bug reports, or feature requests, visit the [GitHub Issues page](https://github.com/involvex/new-world-chat-ai/issues).
