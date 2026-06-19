import React from 'react';

export default function LogsConsole({ logs, isLogsExpanded, setIsLogsExpanded, logsEndRef }) {
  return (
    <div className="control-card logs-card">
      <div 
        className="section-title" 
        style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} 
        onClick={() => setIsLogsExpanded(!isLogsExpanded)}
      >
        <span>Engine Output</span>
        <span>{isLogsExpanded ? '▼' : '▲'}</span>
      </div>
      {isLogsExpanded && (
        <div className="logs-content">
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Waiting for logs...</div>
          ) : (
            logs.map((log, i) => <div key={i}>{log}</div>)
          )}
          <div ref={logsEndRef}></div>
        </div>
      )}
    </div>
  );
}
