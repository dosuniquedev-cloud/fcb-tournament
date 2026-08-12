import { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, MapPin, Trophy, Sparkles, Target } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { RegistrationModal } from './components/RegistrationModal';
import { DigitalMatchPass } from './components/DigitalMatchPass';
import { AdminDashboard } from './components/AdminDashboard';
import { FirebaseGuideModal } from './components/FirebaseGuideModal';
import type { PlayerRegistration } from './types';
import { 
  isFirebaseConfigured, 
  auth, 
  db, 
  getInitialUser, 
  getStoredPlayersLocal, 
  savePlayerLocal, 
  updatePlayerStatusLocal 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createTelemetryRecord, logTelemetry } from './utils/telemetryService';
import { sendWelcomeMatchPassEmail, sendApprovalStatusEmail } from './utils/brevoService';

export function App() {
  const [user, setUser] = useState<{ uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null>(getInitialUser());
  const [players, setPlayers] = useState<PlayerRegistration[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'pass'>('home');

  // Club UPI details
  const upiConfig = {
    id: '8293244903@axl',
    name: 'Mr Nababuddin Sk',
    amount: 250
  };

  // Tournament capacity
  const maxSlots = 50;

  // Listen to Firebase Auth or local user
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL
          });
        } else {
          setUser(null);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Visitor Telemetry — log page view once per browser session
  useEffect(() => {
    if (!sessionStorage.getItem('fcb_page_view_logged')) {
      sessionStorage.setItem('fcb_page_view_logged', '1');
      createTelemetryRecord('page_view')
        .then(record => logTelemetry(record))
        .catch(err => console.warn("Visitor telemetry tracking warning:", err));
    }
  }, []);

  // Fetch / Sync registrations from Firebase or LocalStorage
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const q = collection(db, 'registrations');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: PlayerRegistration[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as PlayerRegistration);
        });
        setPlayers(list);
      }, (error) => {
        console.error("Firestore sync error:", error);
        setPlayers(getStoredPlayersLocal());
      });
      return () => unsubscribe();
    } else {
      // Local storage fallback for immediate demo
      setPlayers(getStoredPlayersLocal());
    }
  }, []);

  // Find user's existing registration (if logged in)
  const existingRegistration = user 
    ? players.find(p => p.uid === user.uid || p.email === user.email) || null 
    : null;

  // Handle New Registration
  const handleRegistrationSuccess = async (registration: PlayerRegistration) => {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'registrations', registration.id), registration);
      } catch (err) {
        console.error("Firebase write error:", err);
      }
    }
    
    // Always update local state & fallback
    const updatedList = savePlayerLocal(registration);
    setPlayers(updatedList);

    // Trigger Production Brevo Transactional Welcome Email
    sendWelcomeMatchPassEmail(registration).catch(err => 
      console.warn("Brevo welcome email dispatch warning:", err)
    );

    setShowRegisterModal(false);
    setActiveTab('pass');
  };

  // Handle Admin Status Change (Approve / Reject)
  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'registrations', id), { status: newStatus });
      } catch (err) {
        console.error("Firebase status update error:", err);
      }
    }

    const updatedList = updatePlayerStatusLocal(id, newStatus);
    setPlayers(updatedList);

    // Trigger Brevo Approval Email if status changed to approved
    if (newStatus === 'approved') {
      const targetPlayer = updatedList.find(p => p.id === id);
      if (targetPlayer) {
        sendApprovalStatusEmail(targetPlayer).catch(err => 
          console.warn("Brevo approval email dispatch warning:", err)
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Futuristic Stadium Background */}
      <div className="bg-atmosphere" />
      <div className="bg-atmosphere-overlay" />

      {/* Navigation Bar */}
      <Navbar
        user={user}
        onOpenAuth={() => setShowRegisterModal(true)}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        onOpenGuide={() => setShowGuideModal(true)}
        slotsRemaining={maxSlots - players.length}
      />

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {isAdmin ? (
          <AdminDashboard
            players={players}
            onUpdateStatus={handleUpdateStatus}
            onRefresh={() => setPlayers(getStoredPlayersLocal())}
            adminEmail={user?.email || 'fcbclub@gmail.com'}
          />
        ) : activeTab === 'pass' && existingRegistration ? (
          <div>
            <div className="max-w-md mx-auto pt-4 px-4">
              <button
                onClick={() => setActiveTab('home')}
                className="btn-ghost text-xs font-bold py-2 px-3 flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Tournament Info
              </button>
            </div>
            <DigitalMatchPass registration={existingRegistration} />
          </div>
        ) : (
          <HeroSection
            totalSlots={maxSlots}
            filledSlots={players.length}
            existingRegistration={existingRegistration}
            onOpenRegister={() => setShowRegisterModal(true)}
            onViewPass={() => setActiveTab('pass')}
          />
        )}
      </main>

      {/* Premium Sports Footer */}
      <footer className="footer">
        <div className="footer-glow-bg" />
        <div className="footer-inner">
          <div className="footer-grid">
            
            {/* Brand Block */}
            <div className="footer-brand">
              <div className="footer-brand-header">
                <img src="/logo.png" alt="FCB Logo" className="footer-logo" />
                <div>
                  <div className="footer-title text-gradient-gold">FCB Summer Ver 13.0</div>
                  <span className="text-xs font-bold text-emerald-400">Square Field Tournament</span>
                </div>
              </div>
              <p className="footer-desc">
                Official registration & digital match entry pass portal for FCB Summer Tournament Ver 13.0. Zero platform fees, direct UPI verification, and instant QR pass generation.
              </p>
              <div className="footer-badge-row">
                <span className="footer-badge"><ShieldCheck size={12} /> 100% Free Platform</span>
                <span className="footer-badge"><Sparkles size={12} /> Instant QR Pass</span>
              </div>
            </div>

            {/* Event Info Column */}
            <div>
              <div className="footer-col-title">Tournament Specs</div>
              <ul className="footer-list">
                <li className="footer-item"><Trophy size={13} color="var(--c-gold)" /> Format: <strong>6-Side Knockout</strong></li>
                <li className="footer-item"><MapPin size={13} color="var(--c-green)" /> Venue: <strong>Square Field</strong></li>
                <li className="footer-item"><Target size={13} color="#3B82F6" /> Goal Post: <strong>Medium (No Hands)</strong></li>
                <li className="footer-item">📅 Date: <strong>23-08-2026</strong></li>
              </ul>
            </div>

            {/* Registration Column */}
            <div>
              <div className="footer-col-title">Entry Details</div>
              <ul className="footer-list">
                <li className="footer-item">💰 Fee: <strong>₹250 / Player</strong></li>
                <li className="footer-item">👥 Capacity: <strong>50 Players Max</strong></li>
                <li className="footer-item">💳 Payment: <strong>Direct UPI</strong></li>
                <li className="footer-item">🎟️ Check-in: <strong>QR Digital Pass</strong></li>
              </ul>
            </div>

          </div>

          {/* Bottom copyright row */}
          <div className="footer-bottom">
            <p>© 2026 FCB Football Club · Summer Tournament Ver 13.0</p>
            <div className="copyright-premium-badge">
              <Sparkles size={14} color="#FFD700" className="animate-pulse" />
              <span className="copyright-gold-text">Copyright : Dos Tanmay- 09</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      {showRegisterModal && (
        <RegistrationModal
          user={user}
          setUser={setUser}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={handleRegistrationSuccess}
          upiConfig={upiConfig}
        />
      )}

      {/* Free Setup Guide Modal */}
      {showGuideModal && (
        <FirebaseGuideModal onClose={() => setShowGuideModal(false)} />
      )}

    </div>
  );
}

export default App;
