import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Sparkles, Flame, Rocket } from 'lucide-react';

interface FirebaseGuideModalProps {
  onClose: () => void;
}

export const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'firebase' | 'vercel'>('firebase');
  const [copied, setCopied] = useState(false);

  const envTemplate = `VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`;

  const copyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl p-6 sm:p-8 relative my-8 border border-emerald-500/30">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-md">
            100% Free Forever ($0 Budget)
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          How to Setup Free Cloud Hosting & Database
        </h2>
        <p className="text-xs text-slate-300 mb-6">
          Your portal currently runs in local preview mode. Follow these 2 simple steps to put it live on the web for free!
        </p>

        {/* Tab Headers */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab('firebase')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'firebase'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Step 1: Free Firebase DB & Auth</span>
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'vercel'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="w-4 h-4 text-emerald-400" />
            <span>Step 2: Free Vercel Hosting</span>
          </button>
        </div>

        {/* TAB 1: FIREBASE */}
        {activeTab === 'firebase' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="bg-slate-900 border border-white/10 p-4 rounded-xl space-y-3">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <span>1. Create Free Firebase Project</span>
                <a
                  href="https://console.firebase.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1 text-xs"
                >
                  console.firebase.google.com <ExternalLink className="w-3 h-3" />
                </a>
              </h3>
              <p>Sign in with your Google account and click <strong>"Add Project"</strong> (e.g. name it <code>FCB-Tournament</code>).</p>
            </div>

            <div className="bg-slate-900 border border-white/10 p-4 rounded-xl space-y-2">
              <h4 className="font-extrabold text-white text-xs">2. Enable 3 Free Features (1-Click Each):</h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li><strong>Authentication:</strong> Go to Build → Authentication → Sign-in method → Enable <strong>Google</strong>.</li>
                <li><strong>Firestore Database:</strong> Go to Build → Firestore Database → Create Database (Start in test mode).</li>
                <li><strong>Storage:</strong> Go to Build → Storage → Get Started (For payment screenshots).</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-white/10 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-xs">3. Get Your API Keys:</h4>
                <button
                  onClick={copyEnv}
                  className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied Template!' : 'Copy .env Template'}</span>
                </button>
              </div>
              <p className="text-slate-400">In Project Settings (Gear icon) → Register Web App → Copy the <code>firebaseConfig</code> values into your <code>.env</code> file.</p>
              <pre className="bg-slate-950 p-3 rounded-lg font-mono text-[10px] text-amber-300 overflow-x-auto border border-white/5">
                {envTemplate}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: VERCEL */}
        {activeTab === 'vercel' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="bg-slate-900 border border-white/10 p-4 rounded-xl space-y-3">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <span>1. Sign up on Vercel</span>
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 text-xs"
                >
                  vercel.com <ExternalLink className="w-3 h-3" />
                </a>
              </h3>
              <p>Vercel gives you <strong>100% free web hosting</strong> with custom SSL certificate and ultra-fast global CDN.</p>
            </div>

            <div className="bg-slate-900 border border-white/10 p-4 rounded-xl space-y-2">
              <h4 className="font-extrabold text-white text-xs">2. Deploy via GitHub or Vercel CLI:</h4>
              <p>Push this project folder to your free GitHub account, then click <strong>"Import Project"</strong> in Vercel.</p>
              <p className="text-slate-400">Alternatively, run <code>npx vercel</code> in your command terminal for instant 30-second deployment!</p>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center">
              <Sparkles className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <h4 className="font-bold text-white text-xs">That's it! Your site will be live at</h4>
              <p className="font-mono text-emerald-400 font-bold text-sm mt-1">https://fcb-tournament.vercel.app</p>
            </div>
          </div>
        )}

        <div className="mt-6 text-right">
          <button onClick={onClose} className="btn-primary py-2.5 px-6">
            <span>Got It, Take Me Back</span>
          </button>
        </div>

      </div>
    </div>
  );
};
