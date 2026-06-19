import React from 'react';

export default function TitleBar({ isActive }) {
  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className="app-logo">🌪️</div>
        <span className="app-title">CatchTheWind</span>
        <div className="proxy-indicator">
          <span className={`indicator-dot ${isActive ? 'active' : ''}`}></span>
          <span>Proxy: {isActive ? 'Recording on port 8080' : 'Inactive'}</span>
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
