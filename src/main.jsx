import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './styles.css';
import './overrides.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

const worker = navigator?.serviceWorker;
if (worker && import.meta.env.PROD) {
  window.addEventListener('load', () => worker.register('/service-worker.js'));
}
