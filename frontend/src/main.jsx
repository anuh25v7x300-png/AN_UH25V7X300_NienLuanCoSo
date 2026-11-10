import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './fonts.css';
import './style.css';
import './extras.css';
import './features.css';
import './home.css';
import './admin.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);
