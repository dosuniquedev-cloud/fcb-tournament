import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Download, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import type { PlayerRegistration } from '../types';

interface DigitalMatchPassProps {
  registration: PlayerRegistration;
}

export const DigitalMatchPass: React.FC<DigitalMatchPassProps> = ({ registration }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const url = await toPng(cardRef.current, { cacheBust: true, quality: 0.95 });
      const a = document.createElement('a');
      a.download = `FCB_Pass_${registration.ticketId}.png`;
      a.href = url;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  const avatarSrc = registration.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${registration.email}`;

  return (
    <div className="pass-page animate-fade-in">

      {/* Official pill */}
      <div className="pass-header-row animate-slide-up">
        <div className="pass-official-pill">
          <Sparkles size={12} /> Official Player Digital Ticket
        </div>
        <p className="pass-save-hint">Save this pass to your phone for gate entry on 23-08-2026</p>
      </div>

      {/* The downloadable pass card */}
      <div ref={cardRef} className="pass-card animate-slide-up delay-100">
        <div className="pass-card-glow-tl" />
        <div className="pass-card-glow-br" />
        <div className="pass-card-grid" />
        <div className="scanline-overlay" />

        {/* Header row */}
        <div className="pass-top-row">
          <div className="pass-club-mark">
            <img src="/logo.png" alt="FCB" className="pass-logo" />
            <div>
              <div className="pass-club-name">FCB Summer Ver 13.0</div>
              <div className="pass-club-date">23-08-2026 · 7:00 AM</div>
            </div>
          </div>
          <div className="pass-ticket-id-block">
            <div className="pass-ticket-label">Pass ID</div>
            <div className="pass-ticket-id">{registration.ticketId}</div>
          </div>
        </div>

        {/* Player info */}
        <div className="pass-player-row">
          <img src={avatarSrc} alt={registration.name} className="pass-player-avatar" />
          <div style={{ overflow: 'hidden' }}>
            <div className="pass-player-name">{registration.name}</div>
            <div className="pass-player-pos">{registration.position}</div>
            <div className="pass-player-phone">+91 {registration.phone}</div>
          </div>
        </div>

        {/* Status badge */}
        <div className="pass-status-row">
          {registration.status === 'approved' && (
            <span className="badge badge-approved" style={{ justifyContent: 'center', width: '100%', padding: '0.5rem' }}>
              <CheckCircle2 size={13} /> Verified Match Day Entry
            </span>
          )}
          {registration.status === 'rejected' && (
            <span className="badge badge-rejected" style={{ justifyContent: 'center', width: '100%', padding: '0.5rem' }}>
              Registration Declined
            </span>
          )}
          {registration.status === 'pending' && (
            <span className="badge badge-pending" style={{ justifyContent: 'center', width: '100%', padding: '0.5rem' }}>
              <Clock size={13} /> Pending Payment Verification
            </span>
          )}
        </div>

        {/* QR Code */}
        <div className="pass-qr-box">
          <QRCodeSVG value={`https://fcb-tournament.vercel.app/verify/${registration.ticketId}`} size={140} level="H" />
          <div className="pass-qr-label">SCAN AT GATE · {registration.ticketId}</div>
        </div>

        {/* Footer */}
        <div className="pass-footer-row">
          <div>
            <div className="pass-footer-key">UTR / Ref No.</div>
            <div className="pass-footer-val">{registration.utrNumber}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="pass-footer-key">Venue</div>
            <div className="pass-footer-val">Square Field</div>
          </div>
        </div>

        {/* Copyright watermark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
          <div className="copyright-premium-badge" style={{ padding: '0.25rem 0.75rem' }}>
            <Sparkles size={11} color="#FFD700" />
            <span className="copyright-gold-text" style={{ fontSize: '0.68rem' }}>Copyright : Dos Tanmay- 09</span>
          </div>
        </div>
      </div>

      {/* Download button */}
      <button onClick={handleDownload} disabled={downloading} className="pass-download-btn">
        <Download size={18} />
        {downloading ? 'Generating Pass...' : 'Save Pass to Phone Gallery'}
      </button>
    </div>
  );
};
