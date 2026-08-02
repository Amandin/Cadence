import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import StreamGuestApp from './stream/StreamGuestApp.jsx';
import { streamRouteRequested, streamTokenFromLocation } from './stream/api.js';
import './styles.css';
import './overrides.css';
import './styles/skins/cadence.css';
import './initiative-rules.css';
import './styles/refinements/shell.css';
import './styles/refinements/initiative.css';
import './styles/refinements/hub.css';
import './styles/refinements/scene-trackers.css';
import './styles/refinements/statuses.css';
import './styles/refinements/participants.css';
import './template-hub.css';
import './styles/trackers/visuals.css';
import './styles/trackers/editor.css';
import './styles/trackers/controls.css';
import './styles/theme/foundation.css';
import './styles/theme/base.css';
import './styles/theme/onboarding.css';
import './styles/theme/controls.css';
import './styles/theme/responsive-mobile.css';
import './styles/theme/responsive-wide.css';
import './styles/theme/dark-compatibility.css';
import './styles/performance-low.css';
import './styles/cloud-sync.css';

function RootRouter() {
  const [, setRouteRevision] = useState(0);
  useEffect(() => {
    const updateRoute = () => setRouteRevision((revision) => revision + 1);
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  const guestRoute = streamRouteRequested(window.location);
  const guestToken = guestRoute ? streamTokenFromLocation(window.location) : '';
  return guestRoute ? <StreamGuestApp token={guestToken} /> : <App />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RootRouter />
    </ErrorBoundary>
  </React.StrictMode>,
);
