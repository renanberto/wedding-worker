import React from 'react';
import { createRoot } from 'react-dom/client';
import SiteRouter from '@wedding/core/components/SiteRouter.jsx';
import { normalizeLocation } from '@wedding/core/lib/navigation.js';
import App from './App.jsx';
import './styles.css';
normalizeLocation();
createRoot(document.getElementById('root')).render(<React.StrictMode><SiteRouter PublicPage={App} /></React.StrictMode>);
