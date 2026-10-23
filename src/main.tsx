import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom';
import { ROUTER_MODE } from './lib/routerMode';

const Router = ROUTER_MODE === 'hash' ? HashRouter : ROUTER_MODE === 'memory' ? MemoryRouter : BrowserRouter;
import App from './app/App';
import { StoreProvider } from './app/store';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <StoreProvider>
        <App />
      </StoreProvider>
    </Router>
  </React.StrictMode>,
);
