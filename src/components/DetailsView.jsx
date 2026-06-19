import React from 'react';

export default function DetailsView({
  selectedPacket,
  onClose,
  activeTab,
  setActiveTab,
  handleCopyText,
  copyFeedback
}) {
  if (!selectedPacket) {
    return (
      <section className="detail-panel" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3>No Request Selected</h3>
          <p>Click on a row in the traffic list to view full request/response headers, decoded body content, and system actions.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div className="detail-title-row">
          <span className={`badge badge-method-${(selectedPacket.method || 'other').toLowerCase()}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
            {selectedPacket.method}
          </span>
          <div className="detail-url">{selectedPacket.url}</div>
          <button onClick={onClose} className="close-detail-btn" title="Close panel">✕</button>
        </div>
        <div className="detail-meta-row">
          <div>Status: <span className={selectedPacket.status >= 200 && selectedPacket.status < 300 ? 'text-success' : 'text-error'}>{selectedPacket.status === 0 ? 'Failed Connect' : selectedPacket.status || 'Pending'}</span></div>
          <div>Time: {new Date(selectedPacket.timestamp * 1000).toLocaleTimeString()}</div>
          {selectedPacket.duration_ms && <div>Duration: {selectedPacket.duration_ms}ms</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button onClick={() => setActiveTab('overview')} className={`tab ${activeTab === 'overview' ? 'active' : ''}`}>Overview</button>
        <button onClick={() => setActiveTab('headers')} className={`tab ${activeTab === 'headers' ? 'active' : ''}`}>Headers</button>
        <button onClick={() => setActiveTab('reqBody')} className={`tab ${activeTab === 'reqBody' ? 'active' : ''}`}>Request Body</button>
        <button onClick={() => setActiveTab('resBody')} className={`tab ${activeTab === 'resBody' ? 'active' : ''}`}>Response Body</button>
        {selectedPacket.host === 'freetube.com.mx' && (
          <button onClick={() => setActiveTab('dnsBypass')} className={`tab ${activeTab === 'dnsBypass' ? 'active' : ''}`}>DNS Bypass</button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="detail-section">
            <div className="section-heading">Request Details</div>
            <div className="kv-grid">
              <div className="kv-key">Scheme</div><div className="kv-val">{selectedPacket.scheme}</div>
              <div className="kv-key">Host</div><div className="kv-val">{selectedPacket.host}</div>
              <div className="kv-key">Path</div><div className="kv-val">{selectedPacket.path}</div>
              <div className="kv-key">Request Content-Type</div><div className="kv-val">{selectedPacket.request?.contentType || 'none'}</div>
            </div>

            <div className="section-heading" style={{ marginTop: '20px' }}>Response Details</div>
            {selectedPacket.response ? (
              <div className="kv-grid">
                <div className="kv-key">Status Code</div><div className="kv-val">{selectedPacket.response.status} {selectedPacket.response.reason}</div>
                <div className="kv-key">Response Content-Type</div><div className="kv-val">{selectedPacket.response.contentType || 'none'}</div>
                <div className="kv-key">Length</div><div className="kv-val">{selectedPacket.response.headers['content-length'] || 'unknown'} bytes</div>
              </div>
            ) : selectedPacket.error ? (
              <div className="text-error" style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <strong>Error:</strong> {selectedPacket.error}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Waiting for response...</div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="section-heading">Request Headers</span>
              <button onClick={() => handleCopyText(JSON.stringify(selectedPacket.request?.headers, null, 2), 'reqHeaders')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                {copyFeedback['reqHeaders'] ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="kv-grid">
              {Object.entries(selectedPacket.request?.headers || {}).map(([k, v]) => (
                <React.Fragment key={k}>
                  <div className="kv-key">{k}</div>
                  <div className="kv-val">{v}</div>
                </React.Fragment>
              ))}
            </div>

            {selectedPacket.response && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <span className="section-heading">Response Headers</span>
                  <button onClick={() => handleCopyText(JSON.stringify(selectedPacket.response?.headers, null, 2), 'resHeaders')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                    {copyFeedback['resHeaders'] ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="kv-grid">
                  {Object.entries(selectedPacket.response.headers).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <div className="kv-key">{k}</div>
                      <div className="kv-val">{v}</div>
                    </React.Fragment>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'reqBody' && (
          <div className="code-viewer-container">
            <div className="code-toolbar">
              <button
                onClick={() => handleCopyText(selectedPacket.request?.body || '', 'reqBody')}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                disabled={!selectedPacket.request?.body}
              >
                {copyFeedback['reqBody'] ? 'Copied!' : 'Copy Body'}
              </button>
            </div>
            {selectedPacket.request?.body ? (
              <pre className="code-view">{selectedPacket.request.body}</pre>
            ) : (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>No Request Body content or content type is not plain text.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'resBody' && (
          <div className="code-viewer-container">
            <div className="code-toolbar">
              <button
                onClick={() => handleCopyText(selectedPacket.response?.body || '', 'resBody')}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                disabled={!selectedPacket.response?.body}
              >
                {copyFeedback['resBody'] ? 'Copied!' : 'Copy Body'}
              </button>
            </div>
            {selectedPacket.response?.body ? (
              <pre className="code-view">{selectedPacket.response.body}</pre>
            ) : (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>No Response Body content or content type is not plain text.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dnsBypass' && (
          <div className="detail-section">
            <div className="section-heading">DNS Resolution Bypass Routing</div>
            <div className="dns-bypass-alert">
              <div className="dns-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Active Route Hijacking (DNS Spoofing)
              </div>
              <p>
                This host (<code>freetube.com.mx</code>) suffers from DNS resolver suppression on typical local network configurations (e.g. ISP blocks or timeouts).
              </p>
              <p>
                To bypass this, our MITM Engine interceptor (<code>DNSBypass</code> addon) intercepted the connection request, skipped Windows DNS resolver, and routed TCP streams straight to:
              </p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '4px', margin: '4px 0' }}>
                IP: <strong style={{ color: 'var(--color-success)' }}>104.21.21.50</strong><br/>
                Port: <strong style={{ color: 'var(--color-success)' }}>443</strong>
              </div>
              <p>
                Result: Seamless loading with full HTTPS capabilities restored!
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
