import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/electron/renderer';
import App from './App';
import './globals.css';
import { initAnalytics } from './lib/analytics';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const isProduction = import.meta.env.PROD;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: isProduction ? 'production' : 'development',
    enabled: isProduction,
  });
}

initAnalytics();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
