import React, { useState, useEffect, useRef } from 'react';
import { Calendar, MapPin, Users, ArrowRight, CheckCircle2, QrCode, ShieldCheck, Target } from 'lucide-react';
import type { PlayerRegistration } from '../types';

interface HeroSectionProps {
  totalSlots: number;
  filledSlots: number;
  existingRegistration: PlayerRegistration | null;
  onOpenRegister: () => void;
  onViewPass: () => void;
}

const DYNAMIC_WORDS = [
  { text: 'GAME',      emoji: '⚽', color: '#00F2FE', glow: 'rgba(0, 242, 254, 0.9)' },   /* Electric Cyan */
  { text: 'SHOWDOWN',  emoji: '🔥', color: '#FFB800', glow: 'rgba(255, 184, 0, 0.9)' },   /* FCB Gold */
  { text: 'ARENA',     emoji: '⚡', color: '#00E87A', glow: 'rgba(0, 232, 122, 0.9)' },   /* Electric Emerald */
  { text: 'MATCH',     emoji: '🏆', color: '#FF2A85', glow: 'rgba(255, 42, 133, 0.9)' },  /* Neon Magenta */
  { text: 'GLORY',     emoji: '🌟', color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.9)' },  /* Sky Diamond */
];

// Always animates IN — React key remount on word change triggers fresh animation
function AnimatedWord({ word, emoji, color, glow }: { word: string; emoji: string; color: string; glow: string }) {
  return (
    <span className="animated-word-wrap" aria-label={word}>
      {word.split('').map((char, i) => (
        <span
          key={i}
          className="anim-char anim-char--in"
          style={{
            animationDelay: `${i * 60}ms`,
            color: color,
            textShadow: `0 0 20px ${glow}, 0 0 45px ${glow}, 0 2px 10px rgba(0,0,0,0.9)`,
          }}
        >
          {char}
        </span>
      ))}
      <span
        className="anim-char anim-emoji anim-char--in"
        style={{
          animationDelay: `${word.length * 60}ms`,
        }}
      >
        {emoji}
      </span>
    </span>
  );
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalSlots, filledSlots, existingRegistration, onOpenRegister, onViewPass,
}) => {
  const remaining = Math.max(0, totalSlots - filledSlots);
  const pct = Math.min(100, Math.round((filledSlots / totalSlots) * 100));

  const [wordIndex, setWordIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setWordIndex(prev => (prev + 1) % DYNAMIC_WORDS.length);
    }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [wordIndex]);

  const metaCards = [
    { icon: <Calendar size={14} color="var(--c-gold)" />, label: 'Date',         val: '23-08-2026',         sub: 'August 23, 2026',      color: 'var(--c-gold)' },
    { icon: <MapPin   size={14} color="var(--c-green)" />, label: 'Venue',        val: 'Square Field',       sub: '6-Side Ground',        color: 'var(--c-green)' },
    { icon: <Target   size={14} color="#3B82F6"        />, label: 'Goal Post',    val: 'Medium Barpost',     sub: 'No hands allowed',     color: '#3B82F6' },
    { icon: <Users    size={14} color="#A78BFA"        />, label: 'Format',       val: '6-Side Tournament',  sub: 'Individual Entry',     color: '#A78BFA' },
  ];

  return (
    <section className="hero-wrap animate-fade-in">

      {/* Top badges */}
      <div className="hero-badges animate-slide-up">
        <div className="hero-live-pill">
          <span className="hero-live-dot" />
          Registrations Open • Limited 50 Slots
        </div>
        <div className="hero-free-pill">
          <ShieldCheck size={12} color="var(--c-green)" />
          0% Platform Fees • Direct UPI
        </div>
      </div>

      {/* Main heading */}
      <div className="hero-title-block animate-slide-up delay-100">
        <div className="hero-eyebrow">FCB Summer Tournament Ver 13.0</div>
        <h1 className="hero-title">
          <span>THE BEAUTIFUL</span>
          <span className="hero-dynamic-word-container">
            <AnimatedWord
              key={wordIndex}
              word={DYNAMIC_WORDS[wordIndex].text}
              emoji={DYNAMIC_WORDS[wordIndex].emoji}
              color={DYNAMIC_WORDS[wordIndex].color}
              glow={DYNAMIC_WORDS[wordIndex].glow}
            />
          </span>
          <span>AWAITS YOU</span>
        </h1>
        <p className="hero-subtitle">
          Join the official <strong>6-side tournament</strong> at <strong>Square Field</strong>. Played with medium barpost (no hands allowed). Secure your slot, pay via zero-fee direct UPI, and instantly claim your <strong style={{ color: 'var(--c-gold)' }}>Digital Match Pass</strong>.
        </p>
      </div>

      {/* Meta cards */}
      <div className="hero-meta-grid animate-slide-up delay-200">
        {metaCards.map((c) => (
          <div key={c.label} className="hero-meta-card">
            <div className="hero-meta-icon" style={{ color: c.color }}>{c.icon} {c.label}</div>
            <div className="hero-meta-val">{c.val}</div>
            <div className="hero-meta-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Slot Counter */}
      <div className="hero-slot-box animate-slide-up delay-300">
        <div className="hero-slot-header">
          <span style={{ color: 'var(--c-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={15} color="var(--c-green)" /> Live Tournament Capacity
          </span>
          <span className="hero-slot-count">{filledSlots} / {totalSlots} · {remaining} slots left</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* CTA */}
      <div className="hero-cta-row animate-slide-up delay-300">
        {existingRegistration ? (
          <button onClick={onViewPass} className="hero-pass-btn">
            <QrCode size={20} />
            View My Match Pass ({existingRegistration.ticketId})
          </button>
        ) : remaining > 0 ? (
          <button onClick={onOpenRegister} className="btn-green" style={{ fontSize: '1.05rem', padding: '1rem 2.25rem', width: '100%', maxWidth: '20rem' }}>
            Register Now — ₹250 <ArrowRight size={18} />
          </button>
        ) : (
          <div className="hero-sold-out">🚫 All 50 Tournament Slots Are Filled!</div>
        )}

        <div className="hero-trust-row">
          <span className="hero-trust-item"><CheckCircle2 size={14} color="var(--c-green)" /> Instant QR Pass</span>
          <span className="hero-trust-item"><CheckCircle2 size={14} color="var(--c-green)" /> Zero Fees</span>
        </div>
      </div>

    </section>
  );
};
