import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ExtractionProvider } from './context/ExtractionContext';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/500.css';

import './styles/global.css';
import './styles/admin-toolbar.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <ExtractionProvider>
      <App />
    </ExtractionProvider>
  </AuthProvider>
);
