import React from 'react';
import { Lock, HelpCircle, LogOut, User as UserIcon } from 'lucide-react';
import { isFirebaseConfigured, logoutUser } from '../firebase';

interface NavbarProps {
  user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null;
  onOpenAuth: () => void;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  onOpenGuide: () => void;
  slotsRemaining: number;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenAuth, isAdmin, setIsAdmin, onOpenGuide }) => (
  <header className="navbar">
    <div className="navbar-inner">

      {/* Brand */}
      <div className="navbar-brand" onClick={() => setIsAdmin(false)}>
        <img src="/logo.png" alt="FCB Logo" className="navbar-logo" />
        <div className="navbar-title-group">
          <div className="navbar-title-row">
            <span className="navbar-title text-gradient-gold">FCB CUP</span>
            <span className="navbar-badge">AUG 15</span>
          </div>
          <div className="navbar-subtitle">Official Tournament Portal</div>
        </div>
      </div>

      {/* Actions */}
      <div className="navbar-actions">
        <button onClick={onOpenGuide} className="btn-ghost navbar-btn-guide">
          <HelpCircle size={14} color="var(--c-green)" />
          <span>Setup Free Cloud</span>
        </button>

        <button onClick={() => setIsAdmin(!isAdmin)} className={`navbar-btn-admin ${isAdmin ? 'active' : ''}`}>
          <Lock size={13} />
          <span>{isAdmin ? 'Exit Admin' : 'Admin'}</span>
        </button>

        {user ? (
          <div className="navbar-user-group">
            <img
              src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
              alt="avatar" className="navbar-avatar"
            />
            <button
              onClick={async () => { await logoutUser(); window.location.reload(); }}
              className="navbar-btn-logout"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : !isAdmin ? (
          <button onClick={onOpenAuth} className="btn-green" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', flexShrink: 0 }}>
            <UserIcon size={14} />
            <span>Login</span>
          </button>
        ) : null}
      </div>
    </div>

    {!isFirebaseConfigured && (
      <div className="navbar-demo-bar">
        <span>⚡ <strong>Preview Mode</strong> — Data saves locally.</span>
        <button onClick={onOpenGuide} style={{ textDecoration: 'underline', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          Connect Firebase Free →
        </button>
      </div>
    )}
  </header>
);
