import React from "react";

interface NotificationProps {
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => (
  <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-cyan-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
    <span>{message}</span>
    <button
      className="ml-4 bg-cyan-900 hover:bg-cyan-800 text-white px-2 py-1 rounded text-xs"
      onClick={onClose}
    >
      Close
    </button>
  </div>
);

export default Notification;
