import React from 'react';
import ReactDOM from 'react-dom/client';
import WebApp from './WebApp';

// Create root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Create React root
const root = ReactDOM.createRoot(rootElement);

// Render the web app
root.render(
  <React.StrictMode>
    <WebApp />
  </React.StrictMode>
); 