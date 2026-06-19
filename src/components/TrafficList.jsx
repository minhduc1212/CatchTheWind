import React from 'react';

export default function TrafficList({ filteredPackets, selectedPacketId, onSelectPacket }) {
  return (
    <section className="list-panel">
      <div className="table-header">
        <span className="col-method">Method</span>
        <span className="col-status">Status</span>
        <span className="col-host">Host</span>
        <span className="col-path">Path</span>
        <span className="col-time">Time</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredPackets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.3 }}>
                <path d="M2 8h15a3 3 0 1 0-3-3" />
                <path d="M2 12h19a3 3 0 1 1-3 3" />
                <path d="M2 16h11a3 3 0 1 0-3-3" />
              </svg>
            </div>
            <h3>No Network Activity</h3>
            <p>Start proxy recording or navigate to websites using Firefox Playwright scan above to inspect traffic.</p>
          </div>
        ) : (
          filteredPackets.map((p) => {
            const methodClass = `badge-method-${(p.method || 'other').toLowerCase()}`;
            let statusClass = 'status-error';
            if (p.status >= 200 && p.status < 300) statusClass = 'status-2xx';
            else if (p.status >= 300 && p.status < 400) statusClass = 'status-3xx';
            else if (p.status >= 400 && p.status < 500) statusClass = 'status-4xx';
            else if (p.status >= 500) statusClass = 'status-5xx';

            const isBypassedDNS = p.host === 'freetube.com.mx';

            return (
              <div
                key={p.id}
                onClick={() => onSelectPacket(p.id)}
                className={`table-row ${selectedPacketId === p.id ? 'selected' : ''}`}
              >
                <span className="col-method">
                  <span className={`badge ${methodClass}`}>{p.method}</span>
                </span>
                <span className="col-status">
                  <span className={`status-badge ${statusClass}`}>
                    {p.status === null ? '...' : p.status === 0 ? 'ERR' : p.status}
                  </span>
                </span>
                <span className="col-host" title={p.host}>
                  {p.host}
                  {isBypassedDNS && <span style={{ color: 'var(--color-redirect)', marginLeft: '4px', fontSize: '9px' }} title="DNS Redirect Active">⚡</span>}
                </span>
                <span className="col-path" title={p.path}>{p.path}</span>
                <span className="col-time">{p.duration_ms ? `${p.duration_ms}ms` : 'pending'}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
