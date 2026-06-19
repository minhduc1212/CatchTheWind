import React, { useState, useEffect, useRef, useMemo } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import TrafficList from './components/TrafficList';
import DetailsView from './components/DetailsView';

export default function App() {
  const [packets, setPackets] = useState([]);
  const [selectedPacketId, setSelectedPacketId] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(true);

  // Filters
  const [filterUrl, setFilterUrl] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');

  // Playwright
  const [playwrightUrl, setPlaywrightUrl] = useState('https://freetube.com.mx/');
  const [playwrightLoading, setPlaywrightLoading] = useState(false);

  // Detail panel tab
  const [activeTab, setActiveTab] = useState('overview');

  // Copy feedback state
  const [copyFeedback, setCopyFeedback] = useState({});

  const logsEndRef = useRef(null);
  const wsRef = useRef(null);

  // ─── WebSocket Connection & Status Checking ───
  useEffect(() => {
    // Check initial proxy status
    window.api.getStatus().then((status) => {
      setIsActive(status.active);
      setIsToggling(false);
    });

    // Listen for proxy status events
    const cleanStatusListener = window.api.onProxyStatus((status) => {
      setIsActive(status.active);
      setIsToggling(false);
    });

    // Listen for backend logs
    const cleanLogListener = window.api.onBackendLog((logLine) => {
      setLogs((prev) => {
        const updated = [...prev, logLine];
        return updated.slice(-400); // Keep last 400 lines
      });
    });

    // Set up WebSocket connection for packets
    const connectWS = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      console.log('Connecting to WebSocket...');
      const ws = new WebSocket('ws://127.0.0.1:9000');
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const record = JSON.parse(event.data);
          setPackets((prev) => {
            const index = prev.findIndex((p) => p.id === record.id);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = record;
              return updated;
            } else {
              return [record, ...prev].slice(0, 1000); // Limit to 1000 packets
            }
          });
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WS connection closed. Retrying in 2s...');
        setTimeout(connectWS, 2000);
      };

      ws.onerror = (err) => {
        console.error('WS Error:', err);
      };
    };

    connectWS();

    return () => {
      cleanStatusListener();
      cleanLogListener();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // ─── Event Handlers ───
  const handleToggleProxy = async () => {
    if (isToggling) return;
    setIsToggling(true);
    if (isActive) {
      await window.api.stopProxy();
    } else {
      await window.api.startProxy();
    }
  };

  const handleClearTraffic = () => {
    setPackets([]);
    setSelectedPacketId(null);
  };

  const handleRunPlaywright = async (e) => {
    e.preventDefault();
    if (!playwrightUrl || playwrightLoading) return;
    setPlaywrightLoading(true);
    try {
      await window.api.runPlaywright(playwrightUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setPlaywrightLoading(false);
    }
  };

  const handleExportTraffic = () => {
    if (packets.length === 0) return;
    const blob = new Blob([JSON.stringify(packets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catchthewind-traffic-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopyFeedback((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    });
  };

  // ─── Filter Logic ───
  const filteredPackets = useMemo(() => {
    return packets.filter((p) => {
      if (filterUrl) {
        const search = filterUrl.toLowerCase();
        const urlMatch = p.url?.toLowerCase().includes(search);
        const hostMatch = p.host?.toLowerCase().includes(search);
        if (!urlMatch && !hostMatch) return false;
      }
      if (filterMethod !== 'ALL' && p.method !== filterMethod) {
        return false;
      }
      if (filterStatus !== 'ALL') {
        const status = p.status;
        if (filterStatus === '2xx' && (status < 200 || status >= 300)) return false;
        if (filterStatus === '3xx' && (status < 300 || status >= 400)) return false;
        if (filterStatus === '4xx' && (status < 400 || status >= 500)) return false;
        if (filterStatus === '5xx' && (status < 500 || status === 0)) return false;
        if (filterStatus === 'ERR' && status !== 0 && status !== null && !p.error) return false;
      }
      if (filterType !== 'ALL') {
        const contentType = (p.response?.contentType || p.request?.contentType || '').toLowerCase();
        if (filterType === 'json' && !contentType.includes('json')) return false;
        if (filterType === 'xml' && !contentType.includes('xml') && !contentType.includes('html')) return false;
        if (filterType === 'js' && !contentType.includes('javascript') && !contentType.includes('js')) return false;
        if (filterType === 'css' && !contentType.includes('css')) return false;
        if (filterType === 'image' && !contentType.includes('image')) return false;
      }
      return true;
    });
  }, [packets, filterUrl, filterMethod, filterStatus, filterType]);

  const selectedPacket = useMemo(() => {
    return packets.find((p) => p.id === selectedPacketId);
  }, [packets, selectedPacketId]);

  return (
    <div className="app-container">
      {/* Custom Title Bar */}
      <TitleBar isActive={isActive} />

      {/* Main Content Body */}
      <main className="main-content">
        <Sidebar
          isActive={isActive}
          isToggling={isToggling}
          handleToggleProxy={handleToggleProxy}
          filterUrl={filterUrl}
          setFilterUrl={setFilterUrl}
          filterMethod={filterMethod}
          setFilterMethod={setFilterMethod}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterType={filterType}
          setFilterType={setFilterType}
          playwrightUrl={playwrightUrl}
          setPlaywrightUrl={setPlaywrightUrl}
          playwrightLoading={playwrightLoading}
          handleRunPlaywright={handleRunPlaywright}
          handleClearTraffic={handleClearTraffic}
          handleExportTraffic={handleExportTraffic}
          packetsCount={packets.length}
          logs={logs}
          isLogsExpanded={isLogsExpanded}
          setIsLogsExpanded={setIsLogsExpanded}
          logsEndRef={logsEndRef}
        />

        <div className="dashboard">
          <TrafficList
            filteredPackets={filteredPackets}
            selectedPacketId={selectedPacketId}
            onSelectPacket={(id) => {
              setSelectedPacketId(id);
              setActiveTab('overview');
            }}
          />

          <DetailsView
            selectedPacket={selectedPacket}
            onClose={() => setSelectedPacketId(null)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleCopyText={handleCopyText}
            copyFeedback={copyFeedback}
          />
        </div>
      </main>
    </div>
  );
}
