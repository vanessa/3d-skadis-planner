import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './reset.css';
import App from './ui/App';
import { ErrorBoundary } from './ui/ErrorBoundary';

if (import.meta.env.DEV) {
  // Hot-reloads the StyleX stylesheet in dev. Not bundled in production.
  void import('virtual:stylex:runtime');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
