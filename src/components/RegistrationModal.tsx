import React, { useState } from 'react';
import { X, User as UserIcon, Upload, Copy, Check, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import type { PlayingPosition, PlayerRegistration } from '../types';
import { signInWithGoogle, isFirebaseConfigured, storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { scanPaymentScreenshot } from '../utils/ocrValidation';
import { createTelemetryRecord, logTelemetry } from '../utils/telemetryService';

interface RegistrationModalProps {
  user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null;
  setUser: (u: any) => void;
  onClose: () => void;
  onSuccess: (r: PlayerRegistration) => void;
  upiConfig: { id: string; name: string; amount: number };
}

const POSITIONS: PlayingPosition[] = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

// Indian 10-digit phone regex (starts with 6, 7, 8, or 9)
const isValidIndianMobile = (num: string): boolean => {
  return /^[6-9]\d{9}$/.test(num);
};

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  user, setUser, onClose, onSuccess, upiConfig,
}) => {
  const [step, setStep] = useState<'auth' | 'details' | 'payment'>(user ? 'details' : 'auth');
  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState<PlayingPosition>('Midfielder');
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ocrAnalyzing, setOcrAnalyzing] = useState(false);
  const [ocrKeywords, setOcrKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    try {
      setLoading(true); setError(null);
      const u = await signInWithGoogle();
      setUser({ uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL });
      setName(u.displayName || '');
      setStep('details');
    } catch (e: any) { setError(e.message || 'Google sign-in failed'); }
    finally { setLoading(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG or JPG)');
      return;
    }
    if (f.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return; }
    
    setOcrAnalyzing(true);
    setError(null);

    const r = new FileReader();
    r.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setScreenshot(dataUrl);
      
      const res = await scanPaymentScreenshot(dataUrl);
      if (res.isValid) {
        setOcrKeywords(res.matchedKeywords);
        setError(null);
      } else {
        setOcrKeywords(res.matchedKeywords);
        setError(res.errorMessage || 'Proof image must be a valid payment receipt screenshot.');
      }
      setOcrAnalyzing(false);
    };
    r.readAsDataURL(f);
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!phone || phone.length !== 10 || !isValidIndianMobile(phone)) {
      setError('Please enter your correct WhatsApp number!!!');
      return;
    }
    setError(null);
    setStep('payment');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isValidIndianMobile(phone)) {
      setError('Please enter your correct 10-digit WhatsApp number (e.g. 9876543210)');
      return;
    }
    if (!utr || utr.length < 6) { setError('Enter valid UTR / transaction ID'); return; }
    if (!screenshot) { setError('Upload your payment screenshot'); return; }
    setLoading(true); setError(null);
    try {
      let finalUrl = screenshot;
      if (isFirebaseConfigured && storage) {
        const sRef = ref(storage, `screenshots/${user.uid}_${Date.now()}.png`);
        await uploadString(sRef, screenshot, 'data_url');
        finalUrl = await getDownloadURL(sRef);
      }

      const ticketId = `FCB-${Math.floor(100 + Math.random() * 900)}`;

      // Capture detailed form submission telemetry (device, IP, lat/long, screen res, OS)
      let telemetryData;
      try {
        telemetryData = await createTelemetryRecord('form_submission', {
          name: name || user.displayName || 'Player',
          phone,
          position,
          ticketId,
          utrNumber: utr,
          hasScreenshot: Boolean(screenshot)
        });
        await logTelemetry(telemetryData);
      } catch (tErr) {
        console.warn("Form submission telemetry capture warning:", tErr);
      }

      onSuccess({
        id: 'reg_' + Date.now(),
        uid: user.uid, name: name || user.displayName || 'Player',
        email: user.email || '', photoURL: user.photoURL || '',
        phone, position, utrNumber: utr, screenshotUrl: finalUrl,
        status: 'pending',
        ticketId,
        createdAt: new Date().toISOString(),
        telemetry: telemetryData
      });
    } catch (e: any) { setError(e.message || 'Submission error'); }
    finally { setLoading(false); }
  };

  const stepIndex = step === 'auth' ? 0 : step === 'details' ? 1 : 2;
  const isPhoneValid = isValidIndianMobile(phone);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button onClick={onClose} className="modal-close"><X size={16} /></button>

        {/* Steps */}
        <div className="modal-steps">
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              <div className={`step-dot ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`} />
              {i < 2 && <div className="step-line" />}
            </React.Fragment>
          ))}
          <div className="step-label">Step {stepIndex + 1} / 3</div>
        </div>

        {error && (
          <div className="modal-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* STEP 1 — AUTH */}
        {step === 'auth' && (
          <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '1rem', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <UserIcon size={26} color="var(--c-green)" />
            </div>
            <div className="modal-step-title">Sign In</div>
            <p className="modal-step-sub">1-tap Google auth — no password needed.</p>
            <button onClick={handleGoogleAuth} disabled={loading} className="btn-google">
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2 — DETAILS */}
        {step === 'details' && (
          <div>
            <div className="modal-step-title">Player Details</div>
            <p className="modal-step-sub">Your contact info and preferred position.</p>
            <form onSubmit={handleDetailsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="fcb-label">Full Name</label>
                <input type="text" required value={name} onChange={e => { setName(e.target.value); setError(null); }} className="fcb-input" placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label className="fcb-label">WhatsApp Number (India)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)', fontWeight: 700, fontSize: '0.9rem' }}>+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhone(val);
                      setError(null);
                    }}
                    className="fcb-input"
                    style={{ paddingLeft: '2.8rem', paddingRight: '2rem' }}
                    placeholder="9876543210"
                  />
                  {phone.length === 10 && (
                    <span style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)' }}>
                      {isPhoneValid ? (
                        <Check size={16} color="var(--c-green)" />
                      ) : (
                        <AlertCircle size={16} color="var(--c-red)" />
                      )}
                    </span>
                  )}
                </div>
                {phone.length > 0 && phone.length < 10 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--c-muted)', marginTop: '0.25rem', display: 'block' }}>
                    {10 - phone.length} digits remaining
                  </span>
                )}
                {phone.length === 10 && !isPhoneValid && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--c-red)', marginTop: '0.25rem', display: 'block' }}>
                    Must start with 6, 7, 8, or 9
                  </span>
                )}
              </div>
              <div>
                <label className="fcb-label">Playing Position</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {POSITIONS.map(p => (
                    <button key={p} type="button" onClick={() => setPosition(p)} className={`pos-btn ${position === p ? 'active' : ''}`}>{p}</button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-green" style={{ width: '100%', marginTop: '0.5rem' }}>Next: Pay ₹{upiConfig.amount}</button>
            </form>
          </div>
        )}

        {/* STEP 3 — PAYMENT */}
        {step === 'payment' && (
          <div>
            <div className="modal-step-title">Direct UPI Payment</div>
            <p className="modal-step-sub">Zero-fee payment directly to the club account.</p>

            <div className="upi-box">
              <div className="upi-qr-frame">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=${encodeURIComponent(upiConfig.id)}%26pn=${encodeURIComponent(upiConfig.name)}%26am=${upiConfig.amount}%26cu=INR`}
                  alt="UPI QR"
                />
              </div>
              <div className="upi-scan-hint">Scan via GPay, PhonePe, Paytm or BHIM</div>
              <div className="upi-id-pill">
                {upiConfig.id}
                <button type="button" onClick={() => { navigator.clipboard.writeText(upiConfig.id); setCopiedUpi(true); setTimeout(() => setCopiedUpi(false), 2000); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                  {copiedUpi ? <Check size={13} color="var(--c-green)" /> : <Copy size={13} color="var(--c-muted)" />}
                </button>
              </div>
              <div className="upi-amount">Amount: ₹{upiConfig.amount}</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="fcb-label">UTR / Transaction Reference</label>
                <input type="text" required value={utr} onChange={e => setUtr(e.target.value)} className="fcb-input" style={{ fontFamily: 'monospace' }} placeholder="e.g. 421589123456" />
              </div>
              <div>
                <label className="fcb-label">Payment Screenshot</label>
                {ocrAnalyzing ? (
                  <div className="upload-zone" style={{ borderStyle: 'solid', borderColor: 'var(--c-gold)', background: 'rgba(255,184,0,0.05)' }}>
                    <Loader2 size={24} className="animate-spin" color="var(--c-gold)" />
                    <span className="upload-zone-text" style={{ color: 'var(--c-gold)' }}>AI OCR Scanning Screenshot Text...</span>
                    <span className="upload-zone-hint">Verifying GPay / PhonePe / Paytm keywords...</span>
                  </div>
                ) : screenshot ? (
                  <div>
                    <div className="upload-preview">
                      <img src={screenshot} alt="Preview" />
                      <button type="button" onClick={() => { setScreenshot(null); setOcrKeywords([]); }} className="upload-remove">✕ Remove</button>
                    </div>
                    {ocrKeywords.length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--c-green)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <ShieldCheck size={14} /> AI OCR Verified:
                        </span>
                        {ocrKeywords.slice(0, 4).map(kw => (
                          <span key={kw} style={{ fontSize: '0.65rem', background: 'rgba(0,232,122,0.15)', color: 'var(--c-green)', border: '1px solid rgba(0,232,122,0.3)', padding: '0.1rem 0.4rem', borderRadius: '0.4rem', fontWeight: 800 }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="upload-zone">
                    <Upload size={24} color="var(--c-green)" />
                    <span className="upload-zone-text">Tap to upload UPI payment screenshot</span>
                    <span className="upload-zone-hint">Automatic AI OCR keyword verification</span>
                    <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setStep('details')} className="btn-ghost" style={{ flex: 1 }}>← Back</button>
                <button type="submit" disabled={loading || ocrAnalyzing} className="btn-gold" style={{ flex: 2 }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm & Get Pass 🎟️'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
