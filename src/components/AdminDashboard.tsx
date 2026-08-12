import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Search, Eye, MessageCircle, 
  Download, QrCode, Lock, ShieldCheck, X, RefreshCw,
  Activity, Smartphone, Monitor, MapPin, Globe, ExternalLink,
  Users, Info, Compass, Mail, Send, Check, AlertTriangle, Loader2, Sparkles
} from 'lucide-react';
import type { PlayerRegistration, VisitorTelemetry } from '../types';
import { fetchTelemetryLogs } from '../utils/telemetryService';
import { getBrevoConfig, saveBrevoConfigLocal, isBrevoReady, sendBrevoTestEmail } from '../utils/brevoService';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface AdminDashboardProps {
  players: PlayerRegistration[];
  onUpdateStatus: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
  onRefresh: () => void;
  adminEmail: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  players,
  onUpdateStatus,
  onRefresh,
}) => {
  // Passcode state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState(false);

  // Tab View Mode
  const [adminTab, setAdminTab] = useState<'roster' | 'telemetry'>('roster');

  // Filters & Search for Roster
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  // Telemetry State
  const [telemetryLogs, setTelemetryLogs] = useState<VisitorTelemetry[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [telemetryFilter, setTelemetryFilter] = useState<'all' | 'page_view' | 'form_submission'>('all');
  const [telemetrySearch, setTelemetrySearch] = useState('');
  const [selectedTelemetry, setSelectedTelemetry] = useState<VisitorTelemetry | null>(null);

  // Brevo Settings & Test Email State
  const [showBrevoModal, setShowBrevoModal] = useState(false);
  const [brevoKeyInput, setBrevoKeyInput] = useState(getBrevoConfig().apiKey);
  const [brevoEmailInput, setBrevoEmailInput] = useState(getBrevoConfig().senderEmail);
  const [brevoNameInput, setBrevoNameInput] = useState(getBrevoConfig().senderName);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleSaveBrevoSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveBrevoConfigLocal(brevoKeyInput, brevoEmailInput, brevoNameInput);
    setTestResult({ success: true, msg: 'Brevo credentials updated successfully!' });
  };

  const handleSendTestEmail = async () => {
    if (!testEmailInput || !testEmailInput.includes('@')) {
      setTestResult({ success: false, msg: 'Please enter a valid recipient email address' });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      // Save current input first
      saveBrevoConfigLocal(brevoKeyInput, brevoEmailInput, brevoNameInput);
      const res = await sendBrevoTestEmail(testEmailInput);
      if (res.success) {
        setTestResult({ success: true, msg: `Test email sent successfully! Message ID: ${res.messageId}` });
      } else {
        setTestResult({ success: false, msg: res.error || 'Failed to send test email via Brevo' });
      }
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || 'Network error' });
    } finally {
      setSendingTest(false);
    }
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '1508' || passcode === 'admin' || passcode === 'fcb2026') {
      setIsAuthenticated(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  };

  // Fetch Telemetry Logs
  const loadTelemetry = async () => {
    setLoadingTelemetry(true);
    try {
      const data = await fetchTelemetryLogs();
      setTelemetryLogs(data);
    } catch (err) {
      console.warn("Failed to load telemetry:", err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTelemetry();
    }
  }, [isAuthenticated]);

  // Stats calculation for Roster
  const totalCount = players.length;
  const pendingCount = players.filter(p => p.status === 'pending').length;
  const approvedCount = players.filter(p => p.status === 'approved').length;
  const rejectedCount = players.filter(p => p.status === 'rejected').length;
  const totalRevenue = approvedCount * 250;

  // Filtered Players
  const filteredPlayers = players.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesQuery = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.utrNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  // Telemetry Analytics Summary
  const pageViewsCount = telemetryLogs.filter(t => t.eventType === 'page_view').length;
  const formUploadsCount = telemetryLogs.filter(t => t.eventType === 'form_submission').length;
  const mobileCount = telemetryLogs.filter(t => t.deviceType === 'Mobile').length;
  const desktopCount = telemetryLogs.filter(t => t.deviceType === 'Desktop' || t.deviceType === 'Tablet').length;
  
  const uniqueCitiesSet = new Set(telemetryLogs.map(t => t.city).filter(Boolean));
  const uniqueCitiesCount = uniqueCitiesSet.size;

  // Filtered Telemetry Logs
  const filteredTelemetry = telemetryLogs.filter(t => {
    const matchesType = telemetryFilter === 'all' || t.eventType === telemetryFilter;
    const q = telemetrySearch.toLowerCase();
    const matchesQuery = !q || 
      (t.ip && t.ip.toLowerCase().includes(q)) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.country && t.country.toLowerCase().includes(q)) ||
      (t.os && t.os.toLowerCase().includes(q)) ||
      (t.browser && t.browser.toLowerCase().includes(q)) ||
      (t.visitorId && t.visitorId.toLowerCase().includes(q)) ||
      (t.submissionDetails?.name && t.submissionDetails.name.toLowerCase().includes(q)) ||
      (t.submissionDetails?.phone && t.submissionDetails.phone.includes(q)) ||
      (t.submissionDetails?.ticketId && t.submissionDetails.ticketId.toLowerCase().includes(q));

    return matchesType && matchesQuery;
  });

  // Export Roster to CSV
  const handleExportCSV = () => {
    const headers = ['Ticket ID', 'Name', 'Phone', 'Position', 'Status', 'UTR Number', 'Email', 'Date'];
    const rows = players.map(p => [
      p.ticketId,
      `"${p.name}"`,
      p.phone,
      p.position,
      p.status.toUpperCase(),
      p.utrNumber,
      p.email,
      new Date(p.createdAt).toLocaleDateString()
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FCB_Tournament_Roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Setup QR Scanner when scanner modal opens
  useEffect(() => {
    if (!showScanner) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 220, height: 220 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        setScannedResult(decodedText);
        scanner.clear();
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [showScanner]);

  // UNLOCK PASSCODE SCREEN
  if (!isAuthenticated) {
    return (
      <>
        <div className="admin-bg" />
        <div className="admin-grid-overlay" />
        <div className="admin-wrap animate-fade-in">
          <div className="admin-lock-card">
            <div className="admin-lock-icon">
              <Lock size={24} />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">Organizer Dashboard</h2>
            <p className="text-xs text-slate-400 mb-6">Enter organizer passcode to manage player registrations & visitor telemetry.</p>

            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="fcb-input text-center text-lg font-mono tracking-widest"
                  placeholder="Passcode: 1508"
                />
                {passError && (
                  <span className="text-xs text-red-400 font-bold mt-2 block">Incorrect passcode! Try "1508" or "admin"</span>
                )}
              </div>

              <button type="submit" className="btn-gold w-full py-3">
                <span>Unlock Admin Panel 🔓</span>
              </button>
            </form>
            <p className="text-[11px] text-slate-500 mt-4">Default organizer passcode: <code className="text-amber-400">1508</code></p>
            <div className="copyright-premium-badge mt-3" style={{ padding: '0.25rem 0.85rem' }}>
              <Sparkles size={12} color="#FFD700" />
              <span className="copyright-gold-text" style={{ fontSize: '0.7rem' }}>Copyright : Dos Tanmay- 09</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="admin-bg" />
      <div className="admin-grid-overlay" />
      <div className="admin-wrap animate-fade-in">
      
      {/* Header Controls */}
      <div className="admin-header-row">
        <div>
          <div className="admin-title-group">
            <ShieldCheck size={24} color="var(--c-gold)" />
            <h2 className="admin-title">Organizer Dashboard</h2>
          </div>
          <p className="admin-subtitle">Real-time payment roster, gate QR scanner & visitor telemetry tracking.</p>
        </div>

        <div className="admin-actions-group">
          <button onClick={() => setShowScanner(true)} className="btn-green text-xs" style={{ padding: '0.5rem 0.9rem' }}>
            <QrCode size={15} /> Gate QR Scanner
          </button>

          <button 
            onClick={() => setShowBrevoModal(true)} 
            className="btn-ghost text-xs" 
            style={{ padding: '0.5rem 0.9rem', color: isBrevoReady() ? 'var(--c-green)' : 'var(--c-gold)' }}
          >
            <Mail size={15} /> Brevo Email {isBrevoReady() ? '🟢' : '⚙️'}
          </button>

          <button onClick={handleExportCSV} className="btn-ghost text-xs" style={{ padding: '0.5rem 0.9rem' }}>
            <Download size={15} /> Export CSV
          </button>

          <button 
            onClick={() => {
              onRefresh();
              loadTelemetry();
            }} 
            className="btn-ghost" 
            style={{ padding: '0.5rem' }} 
            title="Refresh All Data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ADMIN TAB SWITCHER */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.35rem', borderRadius: '1rem', border: '1px solid var(--c-border)' }}>
        <button
          onClick={() => setAdminTab('roster')}
          style={{
            flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s',
            background: adminTab === 'roster' ? 'linear-gradient(135deg, var(--c-gold) 0%, #E6A100 100%)' : 'transparent',
            color: adminTab === 'roster' ? '#04060D' : 'var(--c-muted)',
            boxShadow: adminTab === 'roster' ? '0 4px 20px rgba(255, 184, 0, 0.3)' : 'none',
            border: 'none', cursor: 'pointer'
          }}
        >
          <Users size={16} /> Player Roster & Pass Management ({totalCount})
        </button>

        <button
          onClick={() => {
            setAdminTab('telemetry');
            loadTelemetry();
          }}
          style={{
            flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', fontWeight: 800, fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s',
            background: adminTab === 'telemetry' ? 'linear-gradient(135deg, var(--c-green) 0%, #00B359 100%)' : 'transparent',
            color: adminTab === 'telemetry' ? '#04060D' : 'var(--c-muted)',
            boxShadow: adminTab === 'telemetry' ? '0 4px 20px rgba(0, 232, 122, 0.3)' : 'none',
            border: 'none', cursor: 'pointer'
          }}
        >
          <Activity size={16} /> Visitor & Upload Telemetry ({telemetryLogs.length})
        </button>
      </div>

      {/* ─── TAB 1: PLAYER ROSTER ───────────────────────────────────── */}
      {adminTab === 'roster' && (
        <>
          {/* Stats Summary Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Slots</span>
              <div className="admin-stat-val">{totalCount} <span className="text-xs text-slate-500 font-normal">/ 50</span></div>
            </div>

            <div className="admin-stat-card gold">
              <span className="admin-stat-label" style={{ color: 'var(--c-gold)' }}>Pending</span>
              <div className="admin-stat-val text-gradient-gold">{pendingCount}</div>
            </div>

            <div className="admin-stat-card green">
              <span className="admin-stat-label" style={{ color: 'var(--c-green)' }}>Approved</span>
              <div className="admin-stat-val text-gradient-green">{approvedCount}</div>
            </div>

            <div className="admin-stat-card red">
              <span className="admin-stat-label" style={{ color: 'var(--c-red)' }}>Rejected</span>
              <div className="admin-stat-val text-red-400">{rejectedCount}</div>
            </div>

            <div className="admin-stat-card revenue">
              <span className="admin-stat-label" style={{ color: 'var(--c-green)' }}>Collections</span>
              <div className="admin-stat-val">₹{totalRevenue}</div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="admin-controls-bar">
            {/* Filter Pills */}
            <div className="admin-filter-pills">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`filter-pill ${filterStatus === st ? 'active' : ''}`}
                >
                  {st} ({st === 'all' ? totalCount : st === 'pending' ? pendingCount : st === 'approved' ? approvedCount : rejectedCount})
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="admin-search-wrap">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player name, phone, UTR or ticket ID..."
                className="admin-search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="admin-search-clear">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* MOBILE ROSTER CARDS */}
          <div className="admin-mobile-cards">
            {filteredPlayers.length === 0 ? (
              <div className="admin-empty-state">No player registrations found.</div>
            ) : (
              filteredPlayers.map((player) => (
                <div key={player.id} className="roster-card">
                  
                  {/* Header */}
                  <div className="roster-card-head">
                    <span className="roster-card-ticket">{player.ticketId}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {player.status === 'approved' && <span className="badge badge-approved">Approved</span>}
                      {player.status === 'pending' && <span className="badge badge-pending">Pending</span>}
                      {player.status === 'rejected' && <span className="badge badge-rejected">Rejected</span>}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="roster-card-body">
                    <img
                      src={player.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.email}`}
                      alt="" className="roster-avatar"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="roster-player-name">{player.name}</div>
                      <div className="roster-player-pos">{player.position}</div>
                      <div className="roster-player-utr">UTR: {player.utrNumber} · +91 {player.phone}</div>
                      
                      {player.telemetry && (
                        <button
                          onClick={() => setSelectedTelemetry(player.telemetry!)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.4rem',
                            fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '0.4rem',
                            background: 'rgba(0, 232, 122, 0.12)', border: '1px solid rgba(0, 232, 122, 0.3)',
                            color: 'var(--c-green)', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          <Compass size={11} />
                          {player.telemetry.city ? `${player.telemetry.city}, ${player.telemetry.country}` : 'Device & Lat/Long'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="roster-card-actions">
                    <button
                      onClick={() => setSelectedScreenshot(player.screenshotUrl)}
                      className="action-btn-proof"
                    >
                      <Eye size={13} /> View Proof
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <a
                        href={`https://wa.me/91${player.phone}?text=${encodeURIComponent(
                          `Hi ${player.name}, regarding your FCB Football Cup ticket (${player.ticketId}):`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="action-btn-icon action-btn-wa"
                        title="WhatsApp Player"
                      >
                        <MessageCircle size={15} />
                      </a>

                      {player.status !== 'approved' && (
                        <button
                          onClick={() => onUpdateStatus(player.id, 'approved')}
                          className="action-btn-icon action-btn-approve"
                          title="Approve Ticket Pass"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}

                      {player.status !== 'rejected' && (
                        <button
                          onClick={() => onUpdateStatus(player.id, 'rejected')}
                          className="action-btn-icon action-btn-reject"
                          title="Reject Registration"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>

          {/* DESKTOP ROSTER TABLE */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Player</th>
                  <th>Position</th>
                  <th>UTR Ref</th>
                  <th>Payment Proof</th>
                  <th>Device / Location</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--c-muted)' }}>
                      No player registrations found.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player) => (
                    <tr key={player.id}>
                      <td style={{ fontFamily: 'var(--font-head)', fontWeight: 900, color: 'var(--c-gold)', fontSize: '1rem' }}>
                        {player.ticketId}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <img
                            src={player.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.email}`}
                            alt="" style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: '#fff' }}>{player.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--c-muted)', fontFamily: 'monospace' }}>+91 {player.phone}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontWeight: 800, color: 'var(--c-green)' }}>
                        {player.position}
                      </td>

                      <td style={{ fontFamily: 'monospace', color: 'var(--c-text)' }}>
                        {player.utrNumber}
                      </td>

                      <td>
                        <button
                          onClick={() => setSelectedScreenshot(player.screenshotUrl)}
                          className="action-btn-proof"
                        >
                          <Eye size={13} /> View Proof
                        </button>
                      </td>

                      <td>
                        {player.telemetry ? (
                          <button
                            onClick={() => setSelectedTelemetry(player.telemetry!)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              fontSize: '0.72rem', padding: '0.25rem 0.55rem', borderRadius: '0.5rem',
                              background: 'rgba(0, 232, 122, 0.1)', border: '1px solid rgba(0, 232, 122, 0.25)',
                              color: 'var(--c-green)', fontWeight: 700, cursor: 'pointer'
                            }}
                            title="Inspect submitter device, IP, and location"
                          >
                            <Compass size={12} />
                            {player.telemetry.city || player.telemetry.ip || 'Telemetry Logged'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--c-muted)', fontStyle: 'italic' }}>Standard Upload</span>
                        )}
                      </td>

                      <td>
                        {player.status === 'approved' && <span className="badge badge-approved">Approved</span>}
                        {player.status === 'pending' && <span className="badge badge-pending">Pending</span>}
                        {player.status === 'rejected' && <span className="badge badge-rejected">Rejected</span>}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <a
                            href={`https://wa.me/91${player.phone}?text=${encodeURIComponent(
                              `Hi ${player.name}, regarding your FCB Football Cup ticket (${player.ticketId}):`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="action-btn-icon action-btn-wa"
                            title="WhatsApp Player"
                          >
                            <MessageCircle size={15} />
                          </a>

                          {player.status !== 'approved' && (
                            <button
                              onClick={() => onUpdateStatus(player.id, 'approved')}
                              className="action-btn-icon action-btn-approve"
                              title="Approve Ticket Pass"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}

                          {player.status !== 'rejected' && (
                            <button
                              onClick={() => onUpdateStatus(player.id, 'rejected')}
                              className="action-btn-icon action-btn-reject"
                              title="Reject Registration"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── TAB 2: VISITOR & TELEMETRY ANALYTICS VIEW ──────────────── */}
      {adminTab === 'telemetry' && (
        <>
          {/* Telemetry Summary Stats */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Visits</span>
              <div className="admin-stat-val text-white">{pageViewsCount}</div>
            </div>

            <div className="admin-stat-card green">
              <span className="admin-stat-label" style={{ color: 'var(--c-green)' }}>Form Uploaders</span>
              <div className="admin-stat-val text-gradient-green">{formUploadsCount}</div>
            </div>

            <div className="admin-stat-card gold">
              <span className="admin-stat-label" style={{ color: 'var(--c-gold)' }}>Device Mix</span>
              <div className="admin-stat-val text-gradient-gold" style={{ fontSize: '1.25rem' }}>
                📱 {mobileCount} / 💻 {desktopCount}
              </div>
            </div>

            <div className="admin-stat-card">
              <span className="admin-stat-label">Unique Cities</span>
              <div className="admin-stat-val text-cyan-400">{uniqueCitiesCount}</div>
            </div>
          </div>

          {/* Telemetry Controls & Search */}
          <div className="admin-controls-bar">
            {/* Filter Pills */}
            <div className="admin-filter-pills">
              {(['all', 'page_view', 'form_submission'] as const).map((tType) => (
                <button
                  key={tType}
                  onClick={() => setTelemetryFilter(tType)}
                  className={`filter-pill ${telemetryFilter === tType ? 'active' : ''}`}
                >
                  {tType === 'all' && `All Telemetry (${telemetryLogs.length})`}
                  {tType === 'page_view' && `👁️ Page Visits (${pageViewsCount})`}
                  {tType === 'form_submission' && `📤 Form Submissions (${formUploadsCount})`}
                </button>
              ))}
            </div>

            {/* Telemetry Search */}
            <div className="admin-search-wrap">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                value={telemetrySearch}
                onChange={(e) => setTelemetrySearch(e.target.value)}
                placeholder="Search IP, City, Visitor ID, OS, Device, Submitter..."
                className="admin-search-input"
              />
              {telemetrySearch && (
                <button onClick={() => setTelemetrySearch('')} className="admin-search-clear">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* TELEMETRY TABLE */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Visitor / Submitter</th>
                  <th>Device & OS</th>
                  <th>Screen & Viewport</th>
                  <th>IP Address & Location</th>
                  <th>Lat / Long Coordinates</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {loadingTelemetry ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--c-gold)' }}>
                      Loading telemetry logs...
                    </td>
                  </tr>
                ) : filteredTelemetry.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--c-muted)' }}>
                      No telemetry records logged yet. Visit pages or submit forms to capture live logs!
                    </td>
                  </tr>
                ) : (
                  filteredTelemetry.map((item) => (
                    <tr key={item.id}>
                      {/* Timestamp */}
                      <td style={{ fontSize: '0.78rem', color: '#CBD5E1', fontFamily: 'monospace' }}>
                        {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>

                      {/* Event Type Badge */}
                      <td>
                        {item.eventType === 'form_submission' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.25rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 800,
                            background: 'rgba(0,232,122,0.15)', border: '1px solid rgba(0,232,122,0.35)', color: 'var(--c-green)'
                          }}>
                            📤 Form Upload
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.25rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 800,
                            background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8'
                          }}>
                            👁️ Page Visit
                          </span>
                        )}
                      </td>

                      {/* Visitor / Submitter Name */}
                      <td>
                        {item.submissionDetails?.name ? (
                          <div>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.85rem' }}>{item.submissionDetails.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--c-gold)', fontFamily: 'monospace' }}>
                              {item.submissionDetails.ticketId} · +91 {item.submissionDetails.phone}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--c-muted)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                              {item.visitorId.substring(0, 14)}...
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Device & OS */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {item.deviceType === 'Mobile' ? <Smartphone size={14} color="#38BDF8" /> : <Monitor size={14} color="var(--c-gold)" />}
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem' }}>{item.deviceType} ({item.os})</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--c-muted)' }}>{item.browser}</div>
                          </div>
                        </div>
                      </td>

                      {/* Screen Resolution */}
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94A3B8' }}>
                        <div>{item.screenResolution}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Viewport: {item.viewportSize}</div>
                      </td>

                      {/* IP & City Location */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Globe size={13} color="var(--c-green)" />
                          <div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#F8FAFC', fontSize: '0.8rem' }}>
                              {item.ip || 'Local Host'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--c-muted)' }}>
                              {item.city ? `${item.city}, ${item.country}` : 'Location unknown'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Lat / Long Coordinates */}
                      <td>
                        {item.latitude && item.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.25rem 0.55rem', borderRadius: '0.5rem',
                              background: 'rgba(255, 184, 0, 0.1)', border: '1px solid rgba(255, 184, 0, 0.3)',
                              color: 'var(--c-gold)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none'
                            }}
                            title="Open exact coordinates on Google Maps"
                          >
                            <MapPin size={12} />
                            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--c-muted)', fontStyle: 'italic' }}>IP-Only</span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedTelemetry(item)}
                          className="btn-ghost"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', borderRadius: '0.5rem' }}
                        >
                          <Info size={13} /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── MODAL 1: FULL TELEMETRY INSPECTOR MODAL ────────────────── */}
      {selectedTelemetry && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '32rem', border: '1px solid rgba(0, 232, 122, 0.3)' }}>
            <button onClick={() => setSelectedTelemetry(null)} className="modal-close">
              <X size={16} />
            </button>

            <div className="modal-step-title" style={{ fontSize: '1.2rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="var(--c-green)" /> Detailed Telemetry Inspection
            </div>
            <p className="modal-step-sub" style={{ marginBottom: '1.25rem' }}>
              Complete visitor session & device diagnostics record.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '65vh', overflowY: 'auto' }}>
              
              {/* Event & Visitor Row */}
              <div style={{ background: '#04060D', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-muted)', fontWeight: 700, marginBottom: '0.3rem' }}>EVENT & VISITOR</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div><strong>Event:</strong> {selectedTelemetry.eventType}</div>
                  <div><strong>Visitor ID:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{selectedTelemetry.visitorId}</span></div>
                  <div><strong>Logged:</strong> {new Date(selectedTelemetry.timestamp).toLocaleString()}</div>
                  <div><strong>Connection:</strong> {selectedTelemetry.connectionType}</div>
                </div>
              </div>

              {/* Form Submission Data (if present) */}
              {selectedTelemetry.submissionDetails && (
                <div style={{ background: 'rgba(0, 232, 122, 0.08)', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid rgba(0, 232, 122, 0.25)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-green)', fontWeight: 800, marginBottom: '0.3rem' }}>FORM SUBMISSION ATTACHED</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div><strong>Name:</strong> {selectedTelemetry.submissionDetails.name}</div>
                    <div><strong>Ticket ID:</strong> {selectedTelemetry.submissionDetails.ticketId}</div>
                    <div><strong>Phone:</strong> +91 {selectedTelemetry.submissionDetails.phone}</div>
                    <div><strong>Position:</strong> {selectedTelemetry.submissionDetails.position}</div>
                    <div><strong>UTR:</strong> {selectedTelemetry.submissionDetails.utrNumber}</div>
                    <div><strong>Proof Uploaded:</strong> {selectedTelemetry.submissionDetails.hasScreenshot ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}

              {/* Device & Hardware Specifications */}
              <div style={{ background: '#04060D', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-muted)', fontWeight: 700, marginBottom: '0.3rem' }}>DEVICE & HARDWARE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div><strong>Device Type:</strong> {selectedTelemetry.deviceType}</div>
                  <div><strong>Operating System:</strong> {selectedTelemetry.os}</div>
                  <div><strong>Browser:</strong> {selectedTelemetry.browser}</div>
                  <div><strong>Screen Resolution:</strong> {selectedTelemetry.screenResolution}</div>
                  <div><strong>Viewport Size:</strong> {selectedTelemetry.viewportSize}</div>
                  <div><strong>Timezone:</strong> {selectedTelemetry.timezone}</div>
                </div>
              </div>

              {/* Geolocation & IP Network */}
              <div style={{ background: '#04060D', padding: '0.9rem', borderRadius: '0.75rem', border: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-gold)', fontWeight: 800, marginBottom: '0.3rem' }}>NETWORK & GEOLOCATION</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  <div><strong>IP Address:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{selectedTelemetry.ip || 'Unknown'}</span></div>
                  <div><strong>City / Region:</strong> {selectedTelemetry.city || 'Unknown'}, {selectedTelemetry.region || ''}</div>
                  <div><strong>Country:</strong> {selectedTelemetry.country || 'Unknown'}</div>
                  <div><strong>Accuracy Mode:</strong> {selectedTelemetry.locationAccuracy}</div>
                </div>

                {selectedTelemetry.latitude && selectedTelemetry.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedTelemetry.latitude},${selectedTelemetry.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-gold"
                    style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', textDecoration: 'none' }}
                  >
                    <MapPin size={14} /> Open Location on Google Maps ({selectedTelemetry.latitude.toFixed(4)}, {selectedTelemetry.longitude.toFixed(4)})
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: SCREENSHOT PREVIEW MODAL ──────────────────────── */}
      {selectedScreenshot && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '28rem' }}>
            <button onClick={() => setSelectedScreenshot(null)} className="modal-close">
              <X size={16} />
            </button>
            <div className="modal-step-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>UPI Payment Proof</div>
            <div style={{ background: '#04060D', padding: '0.5rem', borderRadius: '1rem', border: '1px solid var(--c-border)', maxHeight: '65vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={selectedScreenshot} alt="Payment Proof" style={{ maxWidth: '100%', borderRadius: '0.75rem' }} />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: GATE QR SCANNER MODAL ─────────────────────────── */}
      {showScanner && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '24rem', border: '1px solid rgba(0,232,122,0.3)' }}>
            <button onClick={() => { setShowScanner(false); setScannedResult(null); }} className="modal-close">
              <X size={16} />
            </button>
            <div className="modal-step-title" style={{ fontSize: '1.2rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <QrCode size={20} color="var(--c-green)" /> Entrance Scanner
            </div>
            <p className="modal-step-sub" style={{ marginBottom: '1rem' }}>Point camera at player's Digital Match Pass QR Code.</p>

            <div id="qr-reader" style={{ borderRadius: '1rem', overflow: 'hidden', background: '#04060D', border: '1px solid var(--c-border)' }} />

            {scannedResult && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,232,122,0.12)', border: '1px solid rgba(0,232,122,0.3)', borderRadius: '1rem', textAlign: 'center' }}>
                <CheckCircle2 size={28} color="var(--c-green)" style={{ margin: '0 auto 0.4rem' }} />
                <div style={{ fontWeight: 900, color: '#fff', fontSize: '0.9rem' }}>Match Pass Detected!</div>
                <div style={{ fontFamily: 'monospace', color: 'var(--c-green)', fontWeight: 800, fontSize: '0.85rem', marginTop: '0.2rem' }}>{scannedResult}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 4: BREVO EMAIL SETTINGS & LIVE TEST MODAL ─────────── */}
      {showBrevoModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '32rem', border: '1px solid rgba(255, 184, 0, 0.3)' }}>
            <button onClick={() => { setShowBrevoModal(false); setTestResult(null); }} className="modal-close">
              <X size={16} />
            </button>

            <div className="modal-step-title" style={{ fontSize: '1.2rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} color="var(--c-gold)" /> Brevo Transactional Email Integration
            </div>
            <p className="modal-step-sub" style={{ marginBottom: '1.25rem' }}>
              Configure Brevo API key to automatically email Match Passes & Welcome details to players.
            </p>

            {/* STATUS BADGE */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem',
              marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 800,
              background: isBrevoReady() ? 'rgba(0, 232, 122, 0.12)' : 'rgba(255, 184, 0, 0.12)',
              border: isBrevoReady() ? '1px solid rgba(0, 232, 122, 0.3)' : '1px solid rgba(255, 184, 0, 0.3)',
              color: isBrevoReady() ? 'var(--c-green)' : 'var(--c-gold)'
            }}>
              {isBrevoReady() ? (
                <> <Check size={18} /> Brevo Integration Active & Ready </>
              ) : (
                <> <AlertTriangle size={18} /> Brevo API Key Required for Live Email Sending </>
              )}
            </div>

            {/* BREVO CREDENTIALS FORM */}
            <form onSubmit={handleSaveBrevoSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="fcb-label">Brevo API Key (xkeysib-...)</label>
                <input
                  type="password"
                  value={brevoKeyInput}
                  onChange={e => setBrevoKeyInput(e.target.value)}
                  className="fcb-input"
                  style={{ fontFamily: 'monospace' }}
                  placeholder="Paste your Brevo API key here"
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--c-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Get API Key from: Brevo Dashboard → SMTP & API → API Keys
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="fcb-label">Sender Email</label>
                  <input
                    type="email"
                    value={brevoEmailInput}
                    onChange={e => setBrevoEmailInput(e.target.value)}
                    className="fcb-input"
                    placeholder="e.g. fcbclub@gmail.com"
                  />
                </div>
                <div>
                  <label className="fcb-label">Sender Display Name</label>
                  <input
                    type="text"
                    value={brevoNameInput}
                    onChange={e => setBrevoNameInput(e.target.value)}
                    className="fcb-input"
                    placeholder="e.g. FCB Football Club"
                  />
                </div>
              </div>

              <button type="submit" className="btn-gold" style={{ padding: '0.75rem', marginTop: '0.25rem' }}>
                Save Brevo Settings
              </button>
            </form>

            <hr style={{ borderColor: 'var(--c-border)', margin: '1.25rem 0' }} />

            {/* SEND TEST EMAIL SECTION */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Send size={15} color="var(--c-green)" /> Send Live Test Transactional Email
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="email"
                  value={testEmailInput}
                  onChange={e => setTestEmailInput(e.target.value)}
                  className="fcb-input"
                  style={{ flex: 1 }}
                  placeholder="Enter recipient email to test..."
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest}
                  className="btn-green"
                  style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}
                >
                  {sendingTest ? <Loader2 size={16} className="animate-spin" /> : 'Send Test'}
                </button>
              </div>

              {testResult && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700,
                  background: testResult.success ? 'rgba(0, 232, 122, 0.12)' : 'rgba(255, 68, 68, 0.12)',
                  border: testResult.success ? '1px solid rgba(0, 232, 122, 0.3)' : '1px solid rgba(255, 68, 68, 0.3)',
                  color: testResult.success ? 'var(--c-green)' : 'var(--c-red)'
                }}>
                  {testResult.msg}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      </div>
    </>
  );
};
