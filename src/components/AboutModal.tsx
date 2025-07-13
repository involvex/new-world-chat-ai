import { memo } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal = memo<AboutModalProps>(({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleGitHubClick = () => {
    if (window.electronAPI) {
      window.electronAPI.openExternal('https://github.com/involvex/new-world-chat-ai');
    } else {
      window.open('https://github.com/involvex/new-world-chat-ai', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src="./build/icon.png" alt="New World Chat AI" className="w-10 h-10" />
            <h2 className="text-2xl font-bold text-cyan-400">About New World Chat AI</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Version and Creator */}
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              New World Chat AI
            </div>
            <div className="text-lg text-gray-300">Version 1.2.0</div>
            <div className="text-sm text-gray-400">
              Created with ❤️ by <span className="text-cyan-400 font-semibold">Ina Venox</span>
            </div>
          </div>

          {/* Description */}
          <div className="text-center text-gray-300 max-w-lg mx-auto">
            Generate hilarious chat messages for New World using AI-powered screenshot analysis.
            Perfect for adding humor to your MMORPG experience!
          </div>

          {/* Features */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
              🎮 Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-green-400">•</span>
                AI-powered screenshot analysis
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">•</span>
                Auto-paste to game with 🎮 buttons
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">•</span>
                Fully responsive design
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">•</span>
                Customizable hotkeys & prompts
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">•</span>
                System tray integration
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">•</span>
                Message history & export
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
              ⌨️ Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Paste & Generate</span>
                <kbd className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs">Ctrl+V</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Generate Messages</span>
                <kbd className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs">Ctrl+Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Generate Funny</span>
                <kbd className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs">Ctrl+Shift+Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Take Screenshot</span>
                <kbd className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs">Ctrl+Shift+S</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Clear Image</span>
                <kbd className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs">Esc</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Show/Hide App</span>
                <kbd className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs">Ctrl+Shift+N</kbd>
              </div>
            </div>
          </div>

          {/* New World Tip */}
          <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/30 rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-cyan-300 mb-2">💡 New World Tip</div>
            <div className="text-gray-300 italic">
              "Remember: The real treasure was the azoth we spent along the way!" 💰
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
              🛠️ Built With
            </h3>
            <div className="flex flex-wrap gap-2 text-sm">
              {['React', 'TypeScript', 'Electron', 'Tailwind CSS', 'Google Gemini AI', 'RobotJS'].map((tech) => (
                <span key={tech} className="bg-gray-600 text-gray-200 px-2 py-1 rounded">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="text-sm text-gray-400">
            Open source • Made for the New World community
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGitHubClick}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </button>
            <button
              onClick={onClose}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

AboutModal.displayName = 'AboutModal';

export default AboutModal;
