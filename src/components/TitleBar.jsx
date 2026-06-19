import React from 'react';

export default function TitleBar({ isActive }) {
  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className="app-logo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 8h15a3 3 0 1 0-3-3" />
            <path d="M2 12h19a3 3 0 1 1-3 3" />
            <path d="M2 16h11a3 3 0 1 0-3-3" />
          </svg>
        </div>
        <span className="app-title">CatchTheWind</span>
        <div className="proxy-indicator">
          <span className={`indicator-dot ${isActive ? 'active' : ''}`}></span>
          <span>Proxy: {isActive ? 'Recording (port 8080)' : 'Inactive'}</span>
        </div>
      </div>
      <div className="titlebar-actions">
        <button onClick={() => window.api.minimize()} className="titlebar-btn" title="Minimize">─</button>
        <button onClick={() => window.api.maximize()} className="titlebar-btn" title="Maximize">🗖</button>
        <button onClick={() => window.api.close()} className="titlebar-btn close" title="Close">✕</button>
      </div>
    </header>
  );
}
