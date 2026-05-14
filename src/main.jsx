import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './styles.css';
import './overrides.css';
import './theme-cadence.css';
import './initiative-rules.css';
import './initiative-entry-polish.css';
import './header-polish.css';
import './box-tracker-polish.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
