import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import * as api from './data/api.js';
import './styles.css';
import './styles/customer-workspace.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<div className="boot" role="status">Loading Solar CRM…</div>);
// Load the data (from Supabase when configured) before the first screen, so every page starts complete.
api.init().finally(() => root.render(<React.StrictMode><App /></React.StrictMode>));
