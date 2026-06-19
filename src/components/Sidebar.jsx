import React from 'react';
import LogsConsole from './LogsConsole';

export default function Sidebar({
  isActive,
  isToggling,
  handleToggleProxy,
  filterUrl,
  setFilterUrl,
  filterMethod,
  setFilterMethod,
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  playwrightUrl,
  setPlaywrightUrl,
  playwrightLoading,
  handleRunPlaywright,
  handleClearTraffic,
  handleExportTraffic,
  packetsCount,
  logs,
  isLogsExpanded,
  setIsLogsExpanded,
  logsEndRef
}) {
  return (
    <aside className="sidebar">
      {/* Status Section */}
      <div className="control-card">
        <div className="section-title">Control Hub</div>
        <button
          onClick={handleToggleProxy}
          disabled={isToggling}
          className={`btn-primary ${isActive ? 'active' : ''}`}
          style={{ opacity: isToggling ? 0.8 : 1 }}
        >
          {isToggling ? (
            <>
              <span className="loading-dots">{isActive ? 'Stopping' : 'Starting'}</span>
            </>
          ) : isActive ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Stop Capturing
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start Capturing
            </>
          )}
        </button>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Windows routing goes to <code style={{ color: 'var(--accent-purple)' }}>127.0.0.1:8080</code>.<br/>
          Broadcasting WebSocket on <code style={{ color: 'var(--accent-purple)' }}>9000</code>.
        </div>
      </div>

      {/* Traffic Filters */}
      <div className="control-card filter-container">
        <div className="section-title">Filter Traffic</div>
        
        <input
          type="text"
          placeholder="Search domain or path..."
          value={filterUrl}
          onChange={(e) => setFilterUrl(e.target.value)}
          className="input-field"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="select-field"
          >
            <option value="ALL">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="select-field"
          >
            <option value="ALL">All Status</option>
            <option value="2xx">2xx Success</option>
            <option value="3xx">3xx Redir</option>
            <option value="4xx">4xx Client Err</option>
            <option value="5xx">5xx Server Err</option>
            <option value="ERR">Errors</option>
          </select>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="select-field"
        >
          <option value="ALL">All Types</option>
          <option value="json">JSON</option>
          <option value="xml">HTML / XML</option>
          <option value="js">JavaScript</option>
          <option value="css">CSS</option>
          <option value="image">Image</option>
        </select>
      </div>

      {/* Playwright Browser Scanner */}
      <div className="control-card playwright-card">
        <div className="section-title">Playwright Browser Scan</div>
        <form onSubmit={handleRunPlaywright} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="url"
            required
            value={playwrightUrl}
            onChange={(e) => setPlaywrightUrl(e.target.value)}
            className="input-field"
            placeholder="https://freetube.com.mx/"
          />
          <button
            type="submit"
            disabled={playwrightLoading}
            className="btn-primary btn-playwright"
            style={{ opacity: playwrightLoading ? 0.7 : 1 }}
          >
            {playwrightLoading ? (
              <>
                <span className="loading-dots">Launching Browser</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Scan with Firefox
              </>
            )}
          </button>
        </form>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Uses Firefox stealth and forces system DNS resolution. Great for bypassing local blocks.
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleClearTraffic} className="btn-secondary" style={{ flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Clear list
        </button>
        <button onClick={handleExportTraffic} className="btn-secondary" style={{ flex: 1 }} disabled={packetsCount === 0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export JSON
        </button>
      </div>

      {/* Engine Console Output */}
      <LogsConsole 
        logs={logs}
        isLogsExpanded={isLogsExpanded}
        setIsLogsExpanded={setIsLogsExpanded}
        logsEndRef={logsEndRef}
      />
    </aside>
  );
}
