import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { signUp, signIn, signInWithGoogle, logOut } from "./auth";
import { useAuth } from "./AuthContext";
import { saveDailyLog, saveCycleSettings, getCycleSettings, getAllLogs } from "./db";
import { getCycleDay, getNextPeriodDate, getPMSRisk, getPhaseFromDay, getPhaseInfo, formatDate, getDaysUntilNextPeriod } from "./cycleUtils";

const C = {
  bur:  "#7d1f2e",
  bur2: "#a8354a",
  bur3: "#c4607a",
  bur4: "#e8b4bf",
  bur5: "#fdf2f4",
  bur6: "#f5e2e6",
  txt:  "#1a0a0d",
  txt2: "#6b3340",
  txt3: "#b87a86",
};

(() => {
  const id = "trackher-advanced-styles";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; font-family: 'DM Sans', sans-serif; background: #fdf2f4; color: #1a0a0d; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(232,180,191,0.15); }
    ::-webkit-scrollbar-thumb { background: #e8b4bf; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #c4607a; }
    .serif { font-family: 'DM Serif Display', serif; }
    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
    @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
    @keyframes slideDown { from { opacity:0; transform:translateY(-20px) } to { opacity:1; transform:translateY(0) } }
    @keyframes scaleIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .fade-in { animation: fadeIn 0.5s ease forwards; }
    .slide-up { animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
    .slide-down { animation: slideDown 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
    .scale-in { animation: scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
    .glass-card {
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(125,31,46,0.12);
      border-radius: 24px;
      box-shadow: 0 8px 32px rgba(125,31,46,0.08), 0 2px 8px rgba(125,31,46,0.04);
      transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    .glass-card:hover { transform: translateY(-2px); box-shadow: 0 12px 48px rgba(125,31,46,0.12), 0 4px 16px rgba(125,31,46,0.06); }
    .gradient-text {
      background: linear-gradient(135deg, #7d1f2e 0%, #c4607a 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .btn-primary {
      background: linear-gradient(135deg, #7d1f2e 0%, #a8354a 100%);
      color: #fdf2f4; border: none; border-radius: 14px;
      padding: 13px 26px; font-family: 'DM Sans', sans-serif; font-size: 14px;
      font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
      display: inline-flex; align-items: center; gap: 8px;
      box-shadow: 0 4px 16px rgba(125,31,46,0.25); position: relative; overflow: hidden;
    }
    .btn-primary::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%); opacity: 0; transition: opacity 0.2s; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(125,31,46,0.35); }
    .btn-primary:hover::before { opacity: 1; }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-secondary {
      background: #fff; color: #7d1f2e; border: 1.5px solid rgba(125,31,46,0.2);
      border-radius: 14px; padding: 12px 24px; font-family: 'DM Sans', sans-serif;
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 2px 8px rgba(125,31,46,0.08);
    }
    .btn-secondary:hover { background: #fdf2f4; border-color: rgba(125,31,46,0.35); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(125,31,46,0.12); }
    .input-field {
      width: 100%; background: #fff; border: 2px solid rgba(125,31,46,0.15);
      border-radius: 14px; padding: 13px 16px; font-family: 'DM Sans', sans-serif;
      font-size: 14px; color: #1a0a0d; outline: none;
      transition: all 0.2s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 2px 8px rgba(125,31,46,0.04);
    }
    .input-field:focus { border-color: #c4607a; background: #fff; box-shadow: 0 4px 16px rgba(125,31,46,0.12), 0 0 0 3px rgba(196,96,122,0.1); }
    .input-field::placeholder { color: #b87a86; }
    .input-field:disabled { opacity: 0.6; cursor: not-allowed; }
    .tag { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; transition: all 0.2s; cursor: pointer; }
    .tag:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(125,31,46,0.15); }
    .floating-orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.4; animation: float 8s ease-in-out infinite; }
    .shimmer-effect { position: relative; overflow: hidden; }
    .shimmer-effect::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%); background-size: 200% 100%; animation: shimmer 2s infinite; }
    @media (max-width: 768px) { .glass-card { border-radius: 18px; } .btn-primary, .btn-secondary { padding: 11px 20px; font-size: 13px; } }
  `;
  document.head.appendChild(el);
})();

const trendData = [
  { day: "Mon", mood: 7, sleep: 7.5, stress: 4, pms: 20, energy: 8 },
  { day: "Tue", mood: 6, sleep: 6.8, stress: 5, pms: 25, energy: 7 },
  { day: "Wed", mood: 5, sleep: 6.2, stress: 7, pms: 42, energy: 5 },
  { day: "Thu", mood: 4, sleep: 5.9, stress: 8, pms: 58, energy: 4 },
  { day: "Fri", mood: 5, sleep: 7.1, stress: 6, pms: 65, energy: 5 },
  { day: "Sat", mood: 6, sleep: 7.8, stress: 4, pms: 55, energy: 7 },
  { day: "Sun", mood: 7, sleep: 8.2, stress: 3, pms: 40, energy: 8 },
];

const wellnessData = [
  { category: 'Sleep', value: 7.2, fullMark: 10 },
  { category: 'Mood', value: 6.5, fullMark: 10 },
  { category: 'Energy', value: 6.8, fullMark: 10 },
  { category: 'Hydration', value: 5.5, fullMark: 10 },
  { category: 'Exercise', value: 4.2, fullMark: 10 },
];

const symptoms = ["Cramps", "Fatigue", "Bloating", "Headache", "Mood swings", "Back pain", "Tender breasts", "Nausea", "Acne", "Cravings"];

const Icon = {
  home: (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 8L10 2l8 6v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={active ? C.bur5 : "none"} />
      <rect x="7" y="12" width="6" height="6" rx="1" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" />
    </svg>
  ),
  calendar: (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3.5" width="16" height="14" rx="2.5" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" />
      <line x1="6.5" y1="1" x2="6.5" y2="6" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13.5" y1="1" x2="13.5" y2="6" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="2" y1="8.5" x2="18" y2="8.5" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" />
    </svg>
  ),
  trends: (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polyline points="2,15 6,10 9,12 14,6 18,9" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  insights: (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="9" r="5" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" />
      <line x1="10" y1="14.5" x2="10" y2="18" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7.5" y1="18" x2="12.5" y2="18" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="7" x2="10" y2="9.5" stroke={active ? C.bur : C.txt3} strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="11" r="0.9" fill={active ? C.bur : C.txt3} />
    </svg>
  ),
  chat: (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 4A2 2 0 014 2h12a2 2 0 012 2v9a2 2 0 01-2 2H6l-4 4V4z" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinejoin="round" fill={active ? C.bur5 : "none"} />
    </svg>
  ),
  profile: (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="4" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" />
      <path d="M2 18c0-3.5 3.582-6 8-6s8 2.5 8 6" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  bell: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2a5.5 5.5 0 015.5 5.5v3.5l2 2.5H2.5l2-2.5V7.5A5.5 5.5 0 0110 2z" stroke={C.txt3} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.5 15.5a2.5 2.5 0 005 0" stroke={C.txt3} strokeWidth="1.6" />
      <circle cx="15" cy="5" r="3" fill="#ff4757" />
    </svg>
  ),
  add: () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <line x1="11" y1="4" x2="11" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="4" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  arrow: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <polyline points="10,3 16,9 10,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  send: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15 9L3 3l3 6L3 15l12-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  close: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="15" y1="3" x2="3" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  spark: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2l1.5 4.5L15 8l-4.5 1.5L9 14l-1.5-4.5L3 8l4.5-1.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  heart: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 15.5s-6-3.5-6-8a3.5 3.5 0 017 0 3.5 3.5 0 017 0c0 4.5-6 8-6 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  star: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
    </svg>
  ),
};

const phaseColors = {
  period:     { bg: "#fce4e8", text: C.bur,  label: "Menstrual",  emoji: "🔴" },
  follicular: { bg: "#fce8f0", text: C.bur2, label: "Follicular", emoji: "🌱" },
  ovulation:  { bg: C.bur,    text: "#fdf2f4", label: "Ovulation", emoji: "✨" },
  luteal:     { bg: "#f7eef0", text: C.txt3, label: "Luteal",     emoji: "🌙" },
  unknown:    { bg: C.bur6,   text: C.txt2,  label: "Unknown",    emoji: "🌸" },
};

function getPhase(day) {
  if (day >= 1 && day <= 5)  return "period";
  if (day >= 6 && day <= 12) return "follicular";
  if (day >= 13 && day <= 15) return "ovulation";
  return "luteal";
}

/* ─────────────────────────────────────────────
   LANDING PAGE
───────────────────────────────────────────── */
function LandingPage({ onGetStarted, onLogin }) {
  const features = [
    { icon: Icon.spark(), title: "ML-Powered Predictions", desc: "Our model learns your unique cycle pattern and gets smarter with every log." },
    { icon: Icon.calendar(false), title: "Cycle Calendar", desc: "Colour-coded phases — menstrual, follicular, ovulation, luteal — all at a glance." },
    { icon: Icon.trends(false), title: "Trend Insights", desc: "Track how sleep, stress, mood, and PMS risk shift across your cycle." },
    { icon: Icon.chat(false), title: "AI Health Assistant", desc: "Ask anything — symptoms, nutrition, phases — and get empathetic answers." },
    { icon: Icon.bell(), title: "Smart Reminders", desc: "Period approaching? Get notified before it sneaks up on you." },
    { icon: Icon.heart(), title: "Completely Private", desc: "Your data is yours. Never shared, never sold. Ever." },
  ];
  const testimonials = [
    { name: "Rhea M.", text: "Finally an app that actually understands my body. The predictions have been spot-on.", rating: 5 },
    { name: "Ananya S.", text: "The AI assistant answered questions I was too embarrassed to Google. Life-changing.", rating: 5 },
    { name: "Divya K.", text: "I've tried Flo and Clue — TrackHER feels more personal and less clinical.", rating: 5 },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: C.txt, overflowX: "hidden", background: C.bur5 }}>
      <div className="floating-orb" style={{ width: 400, height: 400, background: `radial-gradient(circle, ${C.bur4}, transparent)`, top: -100, right: -100 }} />
      <div className="floating-orb" style={{ width: 300, height: 300, background: `radial-gradient(circle, ${C.bur3}, transparent)`, bottom: 100, left: -50, animationDelay: '2s' }} />

      <nav className="glass-card" style={{ padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, borderRadius: 0 }}>
        <span className="serif gradient-text" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.8px" }}>TrackHER</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn-secondary" style={{ padding: "10px 20px", fontSize: 13 }} onClick={onLogin}>Sign in</button>
          <button className="btn-primary" style={{ padding: "10px 22px", fontSize: 13 }} onClick={onGetStarted}>Get started free</button>
        </div>
      </nav>

      <section style={{ padding: "100px 40px 120px", textAlign: "center", position: "relative" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="fade-in" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, rgba(125,31,46,0.1), rgba(196,96,122,0.1))", color: C.bur, padding: "8px 20px", borderRadius: 24, fontSize: 13, fontWeight: 600, marginBottom: 32, border: `1.5px solid rgba(125,31,46,0.15)` }}>
            {Icon.spark()} ML-powered cycle intelligence
          </div>
          <h1 className="serif slide-down" style={{ fontSize: "clamp(42px, 7vw, 72px)", color: C.txt, lineHeight: 1.05, marginBottom: 24, letterSpacing: "-2px", fontWeight: 400 }}>
            Your cycle,<br /><span className="gradient-text">understood deeply.</span>
          </h1>
          <p className="fade-in" style={{ fontSize: 18, color: C.txt2, lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: "0 auto 40px", fontWeight: 400 }}>
            TrackHER learns your unique pattern to predict periods, ovulation, and PMS risk — with empathy, not just data.
          </p>
          <div className="scale-in" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" style={{ fontSize: 16, padding: "16px 32px" }} onClick={onGetStarted}>Start tracking free {Icon.arrow()}</button>
            <button className="btn-secondary" style={{ fontSize: 16, padding: "15px 28px" }} onClick={onLogin}>I already have an account</button>
          </div>

          <div className="slide-up" style={{ marginTop: 72, display: "flex", justifyContent: "center", gap: 20, perspective: 1200 }}>
            <div className="glass-card" style={{ width: 280, background: "rgba(255,255,255,0.95)", borderRadius: 32, border: `6px solid ${C.txt}`, overflow: "hidden", boxShadow: "0 40px 80px rgba(125,31,46,0.25)", transform: "rotateY(-7deg) rotateX(3deg)", flexShrink: 0 }}>
              <div style={{ background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, padding: "10px 16px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: C.bur5, fontSize: 10, fontWeight: 600 }}>9:41</span>
                  <span style={{ color: C.bur5, fontSize: 10 }}>●●●●</span>
                </div>
              </div>
              <div style={{ background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, padding: "0 16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="serif" style={{ color: C.bur5, fontSize: 20, letterSpacing: "-0.5px" }}>TrackHER</span>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.bur5 }}>P</div>
              </div>
              <div style={{ background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, margin: 12, borderRadius: 18, padding: 16, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 60%)" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 9, color: C.bur4, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 600 }}>Cycle day</div>
                  <div className="serif" style={{ color: C.bur5, fontSize: 36, lineHeight: 1, marginBottom: 6 }}>Day 14</div>
                  <div style={{ fontSize: 11, color: "rgba(253,242,244,0.8)", marginBottom: 10 }}>Ovulation window</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ background: "rgba(255,255,255,0.2)", color: C.bur5, padding: "4px 10px", borderRadius: 12, fontSize: 9, fontWeight: 600 }}>28 day cycle</span>
                    <span style={{ background: C.bur4, color: C.bur, padding: "4px 10px", borderRadius: 12, fontSize: 9, fontWeight: 600 }}>Fertile now</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "0 12px 12px" }}>
                {[["Mar 27", "Next period", C.bur], ["72%", "PMS risk", "#ff6b6b"]].map(([val, lbl, clr]) => (
                  <div key={lbl} style={{ borderRadius: 12, padding: "10px 12px", background: "#fff", border: "1px solid rgba(125,31,46,0.08)" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: clr, marginBottom: 2 }}>{val}</div>
                    <div style={{ fontSize: 9, color: C.txt3, fontWeight: 500 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <button style={{ margin: "0 12px 10px", width: "calc(100% - 24px)", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, color: C.bur5, border: "none", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Log today</button>
              <div style={{ background: "rgba(255,255,255,0.95)", borderTop: `1px solid rgba(125,31,46,0.1)`, display: "flex", justifyContent: "space-around", padding: "10px 0 12px" }}>
                {["Home", "Calendar", "Trends", "Me"].map((n, i) => (
                  <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 16, height: 4, borderRadius: 2, background: i === 0 ? C.bur : C.bur4 }} />
                    <span style={{ fontSize: 8.5, color: i === 0 ? C.bur : C.txt3, fontWeight: 600 }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "100px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ display: "inline-block", background: `linear-gradient(135deg, ${C.bur4}, ${C.bur6})`, color: C.bur, padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 20, textTransform: "uppercase", letterSpacing: "1px" }}>Features</div>
            <h2 className="serif" style={{ fontSize: "clamp(32px, 5vw, 48px)", color: C.txt, marginBottom: 16, letterSpacing: "-1px" }}>Everything you need to<br /><span className="gradient-text">understand your body</span></h2>
            <p style={{ fontSize: 16, color: C.txt2, maxWidth: 540, margin: "0 auto" }}>Designed with care, backed by science, and built for you.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} className="glass-card slide-up" style={{ padding: 32, animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.bur4}, ${C.bur6})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.bur, marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.txt, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.txt2, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "100px 40px", background: C.bur5 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: `linear-gradient(135deg, ${C.bur4}, ${C.bur6})`, color: C.bur, padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 20, textTransform: "uppercase", letterSpacing: "1px" }}>Testimonials</div>
          <h2 className="serif" style={{ fontSize: "clamp(32px, 5vw, 48px)", color: C.txt, marginBottom: 64, letterSpacing: "-1px" }}>Loved by <span className="gradient-text">thousands</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} className="glass-card scale-in" style={{ padding: 32, textAlign: "left", animationDelay: `${i * 0.15}s` }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>{[...Array(t.rating)].map((_, j) => <span key={j} style={{ color: "#ffc107", fontSize: 18 }}>★</span>)}</div>
                <p style={{ fontSize: 15, color: C.txt2, lineHeight: 1.7, marginBottom: 20, fontStyle: "italic" }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur3}, ${C.bur4})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{t.name[0]}</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "100px 40px 120px", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />
        <div style={{ maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h2 className="serif" style={{ fontSize: "clamp(32px, 5vw, 52px)", color: C.bur5, marginBottom: 24, letterSpacing: "-1px", lineHeight: 1.2 }}>Start understanding your body today</h2>
          <p style={{ fontSize: 17, color: "rgba(253,242,244,0.85)", lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: "0 auto 40px" }}>Join thousands of people who trust TrackHER.</p>
          <button className="btn-primary" style={{ background: "#fff", color: C.bur, fontSize: 17, padding: "18px 36px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} onClick={onGetStarted}>Get started for free {Icon.arrow()}</button>
          <p style={{ fontSize: 13, color: "rgba(253,242,244,0.6)", marginTop: 20 }}>No credit card required. Forever free.</p>
        </div>
      </section>

      <footer style={{ background: "#fff", borderTop: `1px solid rgba(125,31,46,0.1)`, padding: "40px 40px", textAlign: "center" }}>
        <span className="serif gradient-text" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px" }}>TrackHER</span>
        <p style={{ fontSize: 13, color: C.txt3, marginTop: 12 }}>Made with care for people who menstruate</p>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AUTH MODAL
───────────────────────────────────────────── */
function AuthModal({ mode, onClose, onSuccess }) {
  const [formMode, setFormMode] = useState(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getFriendlyError = (code) => {
    const errors = {
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/invalid-credential": "Incorrect email or password. Please try again.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    };
    return errors[code] || "Something went wrong. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (formMode === "signup") { await signUp(name, email, password); }
      else { await signIn(email, password); }
      onSuccess();
    } catch (err) {
      setError(getFriendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err) {
      setError(getFriendlyError(err.code));
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,13,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="glass-card scale-in" style={{ maxWidth: 440, width: "100%", padding: 40, position: "relative", background: "rgba(255,255,255,0.98)" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: C.txt3, padding: 8, display: "flex", borderRadius: "50%" }}>{Icon.close()}</button>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span className="serif gradient-text" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.8px" }}>TrackHER</span>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: C.txt, marginTop: 16, marginBottom: 8 }}>{formMode === "signup" ? "Create your account" : "Welcome back"}</h2>
          <p style={{ fontSize: 14, color: C.txt2 }}>{formMode === "signup" ? "Start your cycle tracking journey" : "Sign in to continue"}</p>
        </div>

        {error && (
          <div style={{ background: "#fff0f2", border: `1.5px solid ${C.bur4}`, borderRadius: 12, padding: 12, marginBottom: 20, fontSize: 13, color: C.bur, fontWeight: 500 }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {formMode === "signup" && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 8 }}>Name</label>
              <input type="text" className="input-field" placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 8 }}>Email</label>
            <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 8 }}>Password</label>
            <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8, padding: "14px", justifyContent: "center", fontSize: 15 }} disabled={loading}>
            {loading ? "Please wait..." : formMode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(125,31,46,0.15)" }} />
          <span style={{ fontSize: 12, color: C.txt3, fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(125,31,46,0.15)" }} />
        </div>

        <button onClick={handleGoogle} className="btn-secondary" style={{ width: "100%", padding: "13px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: C.txt2, marginTop: 24 }}>
          {formMode === "signup" ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => { setFormMode(formMode === "signup" ? "signin" : "signup"); setError(""); }} style={{ background: "none", border: "none", color: C.bur, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
            {formMode === "signup" ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD SHELL
───────────────────────────────────────────── */
function Dashboard() {
  const { user } = useAuth();
  const [view, setView] = useState("home");
  const [showLogModal, setShowLogModal] = useState(false);
  const [cycleData, setCycleData] = useState(null);
  const [loadingCycle, setLoadingCycle] = useState(true);

  const loadCycleData = async () => {
    if (!user?.uid) return;
    const settings = await getCycleSettings(user.uid);
    if (settings) {
      const cycleDay = getCycleDay(settings.lastPeriodDate, settings.cycleLength);
      const nextPeriod = getNextPeriodDate(settings.lastPeriodDate, settings.cycleLength);
      const pmsRisk = getPMSRisk(cycleDay, settings.cycleLength);
      const phase = getPhaseFromDay(cycleDay, settings.cycleLength);
      const phaseInfo = getPhaseInfo(phase);
      const daysUntil = getDaysUntilNextPeriod(settings.lastPeriodDate, settings.cycleLength);
      setCycleData({ cycleDay, nextPeriod: formatDate(nextPeriod), pmsRisk, phase, phaseInfo, daysUntil, cycleLength: settings.cycleLength || 28, lastPeriodDate: settings.lastPeriodDate });
    }
    setLoadingCycle(false);
  };

  useEffect(() => { loadCycleData(); }, [user]);

  const cycleDay = cycleData?.cycleDay || 1;
  const nextPeriod = cycleData?.nextPeriod || "—";
  const pmsRisk = cycleData?.pmsRisk || 0;
  const phase = cycleData?.phase || "unknown";
  const phaseInfo = phaseColors[phase] || phaseColors["follicular"];

  const NavItem = ({ id, icon, label }) => {
    const active = view === id;
    return (
      <button onClick={() => setView(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 12, transition: "all 0.2s", transform: active ? "translateY(-2px)" : "none" }}>
        {icon(active)}
        <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? C.bur : C.txt3 }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bur5 }}>
      <header className="glass-card" style={{ padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 0, borderBottom: `1px solid rgba(125,31,46,0.1)` }}>
        <span className="serif gradient-text" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.6px" }}>TrackHER</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: "50%", display: "flex" }}>{Icon.bell()}</button>
          <div onClick={() => setView("profile")} style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur3}, ${C.bur4})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", border: `2px solid ${C.bur5}`, boxShadow: "0 4px 12px rgba(125,31,46,0.2)" }}>
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 32 }}>
        {view === "home"     && <HomeView cycleDay={cycleDay} phase={phase} phaseInfo={phaseInfo} nextPeriod={nextPeriod} pmsRisk={pmsRisk} daysUntil={cycleData?.daysUntil} hasData={!!cycleData} loadingCycle={loadingCycle} user={user} cycleData={cycleData} onLogClick={() => setShowLogModal(true)} />}
        {view === "calendar" && <CalendarView cycleData={cycleData} />}
        {view === "trends"   && <TrendsView uid={user?.uid} />}
        {view === "insights" && <InsightsView cycleData={cycleData} />}
        {view === "chat"     && <ChatView user={user} cycleData={cycleData} />}
        {view === "profile"  && <ProfileView user={user} onCycleUpdate={loadCycleData} />}
      </main>

      <nav className="glass-card" style={{ padding: "12px 20px", display: "flex", justifyContent: "space-around", alignItems: "center", borderRadius: 0, borderTop: `1px solid rgba(125,31,46,0.1)` }}>
        <NavItem id="home"     icon={Icon.home}     label="Home" />
        <NavItem id="calendar" icon={Icon.calendar} label="Calendar" />
        <NavItem id="trends"   icon={Icon.trends}   label="Trends" />
        <NavItem id="insights" icon={Icon.insights} label="Insights" />
        <NavItem id="chat"     icon={Icon.chat}     label="Chat" />
      </nav>

      {showLogModal && <LogModal onClose={() => { setShowLogModal(false); loadCycleData(); }} uid={user?.uid} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HOME VIEW
───────────────────────────────────────────── */
function HomeView({ cycleDay, phase, phaseInfo, nextPeriod, pmsRisk, daysUntil, hasData, loadingCycle, user, cycleData, onLogClick }) {
  const userName = user?.displayName || user?.email?.split("@")[0] || "there";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {!loadingCycle && !hasData && (
        <div className="glass-card fade-in" style={{ padding: 32, marginBottom: 28, background: `linear-gradient(135deg, rgba(125,31,46,0.06), rgba(196,96,122,0.06))`, border: `2px dashed rgba(125,31,46,0.2)`, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌸</div>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: C.txt, marginBottom: 10 }}>Welcome to TrackHER!</h3>
          <p style={{ fontSize: 14, color: C.txt2, marginBottom: 24, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 24px" }}>Log your last period date to start seeing real cycle predictions, phases, and insights personalised to you.</p>
          <button className="btn-primary" onClick={onLogClick}>{Icon.add()} Log your first period</button>
        </div>
      )}

      <div className="fade-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Welcome back, {userName} 👋</h1>
        <p style={{ fontSize: 15, color: C.txt2 }}>Here's your cycle overview for today</p>
      </div>

      <div className="glass-card slide-up" style={{ padding: 40, marginBottom: 24, background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 60%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: C.bur4, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, fontWeight: 700 }}>Cycle day</div>
              <div className="serif" style={{ fontSize: 72, color: C.bur5, lineHeight: 1, marginBottom: 12 }}>{hasData ? `Day ${cycleDay}` : "—"}</div>
              <div style={{ fontSize: 16, color: "rgba(253,242,244,0.85)", marginBottom: 16 }}>{phaseInfo?.emoji} {hasData ? `${phaseInfo?.label} phase` : "Log your period to begin"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", color: C.bur5, padding: "8px 16px", borderRadius: 14, fontSize: 12, fontWeight: 600 }}>{hasData ? `${cycleData?.cycleLength || 28} day cycle` : "Track your cycle"}</span>
                {hasData && phase === "ovulation" && <span style={{ background: C.bur4, color: C.bur, padding: "8px 16px", borderRadius: 14, fontSize: 12, fontWeight: 600 }}>Fertile window</span>}
              </div>
            </div>
            <button onClick={onLogClick} className="btn-primary" style={{ background: "#fff", color: C.bur, fontSize: 15, padding: "14px 28px", boxShadow: "0 6px 20px rgba(0,0,0,0.15)" }}>
              {Icon.add()} Log today
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
        <div className="glass-card scale-in" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.txt3, textTransform: "uppercase", letterSpacing: "1px" }}>Next Period</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur4}, ${C.bur6})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.bur }}>{Icon.calendar(false)}</div>
          </div>
          <div className="serif" style={{ fontSize: 36, fontWeight: 600, color: C.bur, marginBottom: 6 }}>{nextPeriod}</div>
          <p style={{ fontSize: 13, color: C.txt2 }}>{daysUntil ? `In ${daysUntil} days` : "Log your period to predict"}</p>
        </div>

        <div className="glass-card scale-in" style={{ padding: 28, animationDelay: "0.1s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.txt3, textTransform: "uppercase", letterSpacing: "1px" }}>PMS Risk</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #ffd93d, #ffaa00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚠️</div>
          </div>
          <div className="serif" style={{ fontSize: 36, fontWeight: 600, color: "#ff6b6b", marginBottom: 6 }}>{hasData ? `${pmsRisk}%` : "—"}</div>
          <div style={{ width: "100%", height: 8, background: "rgba(255,107,107,0.15)", borderRadius: 4, overflow: "hidden", marginTop: 12 }}>
            <div style={{ width: `${pmsRisk}%`, height: "100%", background: "linear-gradient(90deg, #ff6b6b, #ff8e8e)", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>

        <div className="glass-card scale-in" style={{ padding: 28, animationDelay: "0.2s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.txt3, textTransform: "uppercase", letterSpacing: "1px" }}>Current Phase</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #a8e6cf, #56c596)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{phaseInfo?.emoji || "🌸"}</div>
          </div>
          <div className="serif" style={{ fontSize: 36, fontWeight: 600, color: C.bur, marginBottom: 6 }}>{phaseInfo?.label || "—"}</div>
          <p style={{ fontSize: 13, color: C.txt2 }}>{hasData ? `Day ${cycleDay} of your cycle` : "Log a period to see your phase"}</p>
        </div>
      </div>

      <div className="glass-card slide-up" style={{ padding: 32, marginBottom: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: C.txt, marginBottom: 20 }}>Weekly Wellness Trends</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.bur} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={C.bur} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,31,46,0.1)" />
            <XAxis dataKey="day" stroke={C.txt3} style={{ fontSize: 12, fontWeight: 600 }} />
            <YAxis stroke={C.txt3} style={{ fontSize: 12, fontWeight: 600 }} />
            <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 12, boxShadow: "0 8px 24px rgba(125,31,46,0.15)" }} />
            <Area type="monotone" dataKey="mood" stroke={C.bur} fillOpacity={1} fill="url(#moodGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card slide-up" style={{ padding: 32, background: `linear-gradient(135deg, rgba(125,31,46,0.05), rgba(196,96,122,0.05))` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.bur5 }}>{Icon.spark()}</div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: C.txt, marginBottom: 2 }}>Cycle Insight</h4>
            <p style={{ fontSize: 12, color: C.txt3 }}>Based on your data</p>
          </div>
        </div>
        <p style={{ fontSize: 15, color: C.txt2, lineHeight: 1.7 }}>
          {hasData
            ? `You're in your ${phaseInfo?.label} phase — ${phaseInfo?.tip || "keep tracking for more insights."} You're on day ${cycleDay} of your cycle.`
            : "Log your last period date to start receiving personalised cycle insights tailored to your unique pattern."}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CALENDAR VIEW
───────────────────────────────────────────── */
function CalendarView({ cycleData }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getCellPhase = (day) => {
    if (!day || !cycleData?.lastPeriodDate) return null;
    const lastPeriod = new Date(cycleData.lastPeriodDate);
    const cellDate = new Date(year, month, day);
    const diffDays = Math.floor((cellDate - lastPeriod) / (1000 * 60 * 60 * 24));
    const cycleLen = cycleData.cycleLength || 28;
    const cycleDay = ((diffDays % cycleLen) + cycleLen) % cycleLen + 1;
    return getPhaseFromDay(cycleDay, cycleLen);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="fade-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Cycle Calendar</h1>
        <p style={{ fontSize: 15, color: C.txt2 }}>{monthName}</p>
      </div>
      <div className="glass-card slide-up" style={{ padding: 32 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          {Object.entries(phaseColors).filter(([k]) => k !== "unknown").map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: val.bg, border: `2px solid ${val.text}` }} />
              <span style={{ fontSize: 13, color: C.txt2, fontWeight: 500 }}>{val.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 12 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: C.txt3, padding: 12 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {days.map((day, i) => {
            const p = getCellPhase(day);
            const pc = p ? phaseColors[p] : null;
            const isToday = day === today.getDate();
            return (
              <div key={i} className="scale-in" style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, background: day ? (isToday ? C.bur : pc?.bg || "#fff") : "transparent", border: isToday ? `3px solid ${C.bur}` : `1px solid ${day ? "rgba(125,31,46,0.1)" : "transparent"}`, fontSize: 15, fontWeight: isToday ? 700 : 500, color: isToday ? "#fff" : (pc?.text || C.txt2), cursor: day ? "pointer" : "default", transition: "all 0.2s", animationDelay: `${i * 0.01}s` }}
                onMouseEnter={e => day && (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={e => day && (e.currentTarget.style.transform = "scale(1)")}>
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TRENDS VIEW
───────────────────────────────────────────── */
function TrendsView({ uid }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!uid) return;
      const allLogs = await getAllLogs(uid);
      if (allLogs.length > 0) {
        const formatted = allLogs.slice(0, 7).reverse().map(log => ({
          day: new Date(log.date).toLocaleDateString("en-US", { weekday: "short" }),
          mood: log.mood || 0, sleep: log.sleep || 0,
          stress: log.stress || 0, energy: log.energy || 0,
        }));
        setLogs(formatted);
      }
    };
    load();
  }, [uid]);

  const chartData = logs.length > 0 ? logs : trendData;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="fade-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Wellness Trends</h1>
        <p style={{ fontSize: 15, color: C.txt2 }}>{logs.length > 0 ? "Based on your logged data" : "Log daily to see your real trends"}</p>
      </div>
      <div style={{ display: "grid", gap: 24 }}>
        <div className="glass-card slide-up" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.txt, marginBottom: 20 }}>Mood & Energy</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,31,46,0.1)" />
              <XAxis dataKey="day" stroke={C.txt3} style={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis stroke={C.txt3} style={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 12, boxShadow: "0 8px 24px rgba(125,31,46,0.15)" }} />
              <Line type="monotone" dataKey="mood" stroke={C.bur} strokeWidth={3} dot={{ fill: C.bur, r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="energy" stroke={C.bur3} strokeWidth={3} dot={{ fill: C.bur3, r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card slide-up" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.txt, marginBottom: 20 }}>Sleep & Stress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,31,46,0.1)" />
              <XAxis dataKey="day" stroke={C.txt3} style={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis stroke={C.txt3} style={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip contentStyle={{ background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 12, boxShadow: "0 8px 24px rgba(125,31,46,0.15)" }} />
              <Bar dataKey="sleep" fill={C.bur} radius={[8, 8, 0, 0]} />
              <Bar dataKey="stress" fill="#ff6b6b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card slide-up" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.txt, marginBottom: 20 }}>Wellness Balance</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={wellnessData}>
              <PolarGrid stroke="rgba(125,31,46,0.2)" />
              <PolarAngleAxis dataKey="category" style={{ fontSize: 13, fontWeight: 600, fill: C.txt2 }} />
              <PolarRadiusAxis angle={90} domain={[0, 10]} style={{ fontSize: 11, fill: C.txt3 }} />
              <Radar name="Your Score" dataKey="value" stroke={C.bur} fill={C.bur} fillOpacity={0.4} strokeWidth={3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INSIGHTS VIEW
───────────────────────────────────────────── */
function InsightsView({ cycleData }) {
  const phase = cycleData?.phase || "unknown";
  const phaseInfo = getPhaseInfo(phase);

  const insights = [
    { icon: "💧", title: "Hydration", desc: "Staying hydrated reduces bloating and supports hormone regulation throughout your cycle.", color: "#4dabf7" },
    { icon: "🏃", title: "Exercise", desc: phase === "follicular" || phase === "ovulation" ? "You're in a high-energy phase — great time for intense workouts and strength training!" : "Gentle movement like yoga and walking is ideal for your current phase.", color: "#51cf66" },
    { icon: "😴", title: "Sleep", desc: phase === "luteal" ? "Progesterone in your luteal phase can disrupt sleep. Try magnesium before bed and limit screens." : "Consistent sleep strengthens your hormonal balance. Aim for 7–9 hours each night.", color: "#845ef7" },
    { icon: "🧘", title: "Stress", desc: cycleData ? `You're in your ${phaseInfo?.label} phase. ${phase === "luteal" ? "Stress sensitivity is highest now — prioritise rest." : "This is a good time to handle challenging tasks."}` : "Track your cycle to get phase-specific stress tips.", color: "#ff6b6b" },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="fade-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Personalized Insights</h1>
        <p style={{ fontSize: 15, color: C.txt2 }}>{cycleData ? `Based on your ${phaseInfo?.label} phase` : "Log your cycle to get personalised insights"}</p>
      </div>
      <div style={{ display: "grid", gap: 20 }}>
        {insights.map((item, i) => (
          <div key={i} className="glass-card slide-up" style={{ padding: 28, display: "flex", gap: 20, alignItems: "flex-start", animationDelay: `${i * 0.1}s` }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${item.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.txt, marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 15, color: C.txt2, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {cycleData && (
        <div className="glass-card slide-up" style={{ padding: 40, marginTop: 32, background: `linear-gradient(135deg, rgba(125,31,46,0.05), rgba(196,96,122,0.05))` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.bur5, fontSize: 24 }}>{Icon.star()}</div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.txt, marginBottom: 4 }}>Phase Summary</h3>
              <p style={{ fontSize: 13, color: C.txt3 }}>Day {cycleData.cycleDay} · {phaseInfo?.label} phase</p>
            </div>
          </div>
          <p style={{ fontSize: 15, color: C.txt2, lineHeight: 1.7 }}>{phaseInfo?.tip}</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CHAT VIEW
───────────────────────────────────────────── */
function ChatView({ user, cycleData }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! 🎀 I'm your cycle health assistant. Ask me anything about your symptoms, cycle phases, nutrition, or how you're feeling today." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "What should I eat during my period?",
    "Why do I feel so tired on day 1?",
    "What helps with cramps?",
    "How do I manage PMS mood swings?",
  ];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const ctx = cycleData ? { cycleDay: cycleData.cycleDay, phase: cycleData.phase, pmsRisk: cycleData.pmsRisk, nextPeriod: cycleData.nextPeriod, cycleLength: cycleData.cycleLength } : null;

  const getRuleBasedResponse = (text, ctx) => {
    const t = text.toLowerCase();
    const phaseMsg = ctx ? `By the way, you're currently on day ${ctx.cycleDay} of your cycle in your ${ctx.phase} phase.` : "";

    if (t.includes("cramp") || t.includes("pain")) return `For cramps, try a heating pad on your lower abdomen — one of the most effective remedies. Ibuprofen or naproxen taken at the first sign works best. Light movement like walking or yoga also helps. Magnesium supplements taken daily may reduce cramping over time. ${phaseMsg}`;
    if (t.includes("eat") || t.includes("food") || t.includes("diet") || t.includes("nutrition")) {
      if (ctx?.phase === "period") return `During your period, focus on iron-rich foods like spinach, lentils, and red meat. Dark chocolate and magnesium-rich nuts ease cramps. Avoid excess salt and caffeine which worsen bloating. Warm ginger tea is great for comfort. 🍵`;
      if (ctx?.phase === "follicular") return `In your follicular phase your estrogen is rising so metabolism is efficient. Focus on lean proteins, fermented foods like yogurt and kimchi, and plenty of vegetables. 🥗`;
      if (ctx?.phase === "ovulation") return `During ovulation, focus on anti-inflammatory foods — berries, leafy greens, and omega-3 rich foods like salmon. Zinc-rich pumpkin seeds support healthy ovulation. ✨`;
      if (ctx?.phase === "luteal") return `In your luteal phase cravings are normal — your body needs more calories. Focus on complex carbs like sweet potato and oats to stabilise mood. Dark chocolate is actually a good choice here! 🍫`;
      return `Eating well through your cycle makes a big difference. Iron and magnesium during your period, light and energising in follicular, anti-inflammatory around ovulation, and complex carbs in luteal. ${phaseMsg}`;
    }
    if (t.includes("tired") || t.includes("fatigue") || t.includes("energy") || t.includes("exhausted")) return `Fatigue is one of the most common cycle symptoms. ${ctx?.phase === "period" ? "During your period your body is working hard — rest is essential." : ctx?.phase === "luteal" ? "In the luteal phase, progesterone has a sedative effect. Completely normal." : ""} Prioritise sleep, eat iron-rich foods, stay hydrated, and reduce caffeine. Light exercise can boost energy more than resting. ${phaseMsg}`;
    if (t.includes("pms") || t.includes("mood") || t.includes("irritable") || t.includes("emotional") || t.includes("anxious")) return `PMS mood symptoms are caused by the drop in estrogen and progesterone before your period. ${ctx ? `Your current PMS risk is ${ctx.pmsRisk}%.` : ""} Magnesium (400mg daily), regular exercise, reducing sugar and caffeine, and getting enough sleep all genuinely help. ${phaseMsg}`;
    if (t.includes("bloat")) return `Bloating is super common especially before your period. Reduce salt, avoid carbonated drinks, eat smaller meals, and try peppermint or ginger tea. Light movement helps. ${phaseMsg}`;
    if (t.includes("headache") || t.includes("migraine")) return `Hormonal headaches are triggered by the drop in estrogen before your period. Stay hydrated, maintain consistent sleep, and avoid skipping meals. Magnesium supplementation reduces hormonal migraines significantly over time. ${phaseMsg}`;
    if (t.includes("sleep") || t.includes("insomnia")) return `Sleep is strongly affected by your cycle. ${ctx?.phase === "luteal" ? "In your luteal phase, the hormone drop before your period can cause insomnia." : ctx?.phase === "period" ? "During your period, cramps can disrupt sleep — a heating pad and ibuprofen before bed help." : ""} Magnesium glycinate before bed is one of the most effective natural sleep aids. ${phaseMsg}`;
    if (t.includes("exercise") || t.includes("workout") || t.includes("gym")) {
      if (ctx?.phase === "period") return `During your period, gentle movement releases endorphins that reduce cramps. Try walking, light yoga, or swimming. 🧘`;
      if (ctx?.phase === "follicular") return `Your follicular phase is the best time for high intensity workouts! Rising estrogen boosts strength and recovery. 💪`;
      if (ctx?.phase === "ovulation") return `Around ovulation you have peak energy and strength. Great time for competitive sports or HIIT. ✨`;
      if (ctx?.phase === "luteal") return `In your luteal phase shift toward moderate intensity — pilates, hiking, or yoga. Exercise still really helps with PMS. 🌙`;
      return `Tuning workouts to your cycle improves performance and recovery. Strongest in follicular and ovulation, benefit most from gentle movement in luteal. ${phaseMsg}`;
    }
    if (t.includes("phase") || t.includes("what phase")) {
      if (ctx) { const info = getPhaseInfo(ctx.phase); return `You're currently in your ${info.label} phase (day ${ctx.cycleDay} of ${ctx.cycleLength}). ${info.tip} Your next period is expected around ${ctx.nextPeriod}.`; }
      return `Your cycle has four phases: Menstrual (days 1–5), Follicular (days 6–12), Ovulation (days 13–15), and Luteal (days 16–28). Log your period date to see which phase you're in!`;
    }
    if (t.includes("next period") || t.includes("predict")) {
      if (ctx) return `Based on your cycle data, your next period is expected around ${ctx.nextPeriod}. You're currently on day ${ctx.cycleDay} of your ${ctx.cycleLength}-day cycle.`;
      return `Log your last period date in the app to get a prediction for your next period!`;
    }
    if (t.includes("hello") || t.includes("hi") || t.includes("hey")) return `Hey there! 🌸 ${ctx ? `I can see you're on day ${ctx.cycleDay} of your cycle in your ${ctx.phase} phase.` : "Log your cycle data to get personalised insights!"} What can I help you with?`;
    return `That's a great question! ${ctx ? `Given you're in your ${ctx.phase} phase (day ${ctx.cycleDay}), ` : ""}the pillars of good cycle health are: consistent sleep, magnesium-rich foods, regular gentle movement, and stress management. Is there something more specific I can help with? 🌸`;
  };

  const handleSend = (text) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const reply = getRuleBasedResponse(msg, ctx);
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      setLoading(false);
    }, 800);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", height: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}>
      <div className="fade-in" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Cycle Assistant</h1>
        <p style={{ fontSize: 15, color: C.txt2 }}>{ctx ? `Day ${ctx.cycleDay} · ${ctx.phase} phase` : "Ask me anything about your cycle"}</p>
      </div>

      <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
          {messages.map((msg, i) => (
            <div key={i} className="fade-in" style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "flex-start", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.role === "assistant" && (
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🌸</div>
              )}
              <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px", background: msg.role === "user" ? `linear-gradient(135deg, ${C.bur}, ${C.bur2})` : "#fff", color: msg.role === "user" ? "#fff" : C.txt, fontSize: 14, lineHeight: 1.6, boxShadow: "0 2px 8px rgba(125,31,46,0.08)", whiteSpace: "pre-wrap" }}>
                {msg.text}
              </div>
              {msg.role === "user" && (
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur3}, ${C.bur4})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {user?.displayName?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🌸</div>
              <div style={{ background: "#fff", borderRadius: "4px 18px 18px 18px", padding: "14px 18px", display: "flex", gap: 5, boxShadow: "0 2px 8px rgba(125,31,46,0.08)" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.bur4, animation: `pulse-dot 1.2s infinite ${i * 0.2}s` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div style={{ padding: "0 20px 12px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => handleSend(s)} style={{ background: C.bur6, border: `1px solid ${C.bur4}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, color: C.bur, cursor: "pointer", whiteSpace: "nowrap", fontWeight: 500 }}>{s}</button>
            ))}
          </div>
        )}

        <div style={{ borderTop: `1px solid rgba(125,31,46,0.1)`, padding: 20 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <input type="text" className="input-field" placeholder="Ask about symptoms, cycle phases, or wellness..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} style={{ flex: 1 }} />
            <button onClick={() => handleSend()} className="btn-primary" style={{ padding: "13px 24px" }} disabled={!input.trim() || loading}>{Icon.send()}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROFILE VIEW
───────────────────────────────────────────── */
function ProfileView({ user, onCycleUpdate }) {
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      const settings = await getCycleSettings(user.uid);
      if (settings) {
        setCycleLength(settings.cycleLength || 28);
        setPeriodDuration(settings.periodDuration || 5);
        setLastPeriodDate(settings.lastPeriodDate || "");
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    await saveCycleSettings(user.uid, { cycleLength: +cycleLength, periodDuration: +periodDuration, lastPeriodDate });
    setSaving(false);
    setSaved(true);
    if (onCycleUpdate) onCycleUpdate();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div className="fade-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Profile</h1>
        <p style={{ fontSize: 15, color: C.txt2 }}>Manage your account and cycle settings</p>
      </div>

      <div className="glass-card slide-up" style={{ padding: 40, textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur3})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 42, margin: "0 auto 20px", border: `4px solid ${C.bur5}`, boxShadow: "0 8px 24px rgba(125,31,46,0.2)" }}>
          {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: C.txt, marginBottom: 6 }}>{user?.displayName || user?.email?.split("@")[0] || "User"}</h2>
        <p style={{ fontSize: 14, color: C.txt3 }}>{user?.email}</p>
      </div>

      <div className="glass-card slide-up" style={{ padding: 32, marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: C.txt, marginBottom: 20 }}>Cycle Settings</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 8 }}>Last Period Start Date</label>
            <input type="date" className="input-field" value={lastPeriodDate} onChange={e => setLastPeriodDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 8 }}>Average Cycle Length (days)</label>
            <input type="number" className="input-field" value={cycleLength} onChange={e => setCycleLength(e.target.value)} min="21" max="45" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 8 }}>Period Duration (days)</label>
            <input type="number" className="input-field" value={periodDuration} onChange={e => setPeriodDuration(e.target.value)} min="1" max="10" />
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: 20, width: "100%", justifyContent: "center" }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>

      <button onClick={() => logOut()} className="btn-secondary" style={{ width: "100%", justifyContent: "center", color: "#ff4757", borderColor: "#ff4757" }}>
        Sign Out
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOG MODAL
───────────────────────────────────────────── */
function LogModal({ onClose, uid }) {
  const [mood, setMood] = useState(7);
  const [sleep, setSleep] = useState(7);
  const [stress, setStress] = useState(4);
  const [energy, setEnergy] = useState(7);
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleSymptom = (symptom) => setSelectedSymptoms(prev => prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]);

  const handleSave = async () => {
    if (!uid) { onClose(); return; }
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    await saveDailyLog(uid, today, { mood: +mood, sleep: +sleep, stress: +stress, energy: +energy, symptoms: selectedSymptoms });
    if (lastPeriodDate) {
      await saveCycleSettings(uid, { lastPeriodDate, cycleLength: 28, periodDuration: 5 });
    }
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,10,13,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div className="glass-card scale-in" style={{ maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 40, position: "relative", background: "rgba(255,255,255,0.98)" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: C.txt3, padding: 8 }}>{Icon.close()}</button>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: C.txt, marginBottom: 8 }}>Log Today</h2>
        <p style={{ fontSize: 14, color: C.txt2, marginBottom: 32 }}>Track how you're feeling</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 12 }}>Last period start date <span style={{ color: C.txt3, fontWeight: 400 }}>(optional — updates predictions)</span></label>
            <input type="date" className="input-field" value={lastPeriodDate} onChange={e => setLastPeriodDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 12 }}>Mood: {mood}/10</label>
            <input type="range" min="1" max="10" value={mood} onChange={e => setMood(e.target.value)} style={{ width: "100%", height: 8, borderRadius: 4, accentColor: C.bur, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 12 }}>Energy: {energy}/10</label>
            <input type="range" min="1" max="10" value={energy} onChange={e => setEnergy(e.target.value)} style={{ width: "100%", height: 8, borderRadius: 4, accentColor: C.bur3, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 12 }}>Sleep: {sleep} hrs</label>
            <input type="range" min="1" max="12" value={sleep} onChange={e => setSleep(e.target.value)} style={{ width: "100%", height: 8, borderRadius: 4, accentColor: C.bur2, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 12 }}>Stress: {stress}/10</label>
            <input type="range" min="1" max="10" value={stress} onChange={e => setStress(e.target.value)} style={{ width: "100%", height: 8, borderRadius: 4, accentColor: "#ff6b6b", outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 12 }}>Symptoms</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {symptoms.map(s => (
                <button key={s} onClick={() => toggleSymptom(s)} className="tag" style={{ background: selectedSymptoms.includes(s) ? C.bur : C.bur6, color: selectedSymptoms.includes(s) ? C.bur5 : C.txt2, border: `1.5px solid ${selectedSymptoms.includes(s) ? C.bur : "rgba(125,31,46,0.2)"}` }}>{s}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 12, padding: "16px" }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Log"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT
───────────────────────────────────────────── */
export default function TrackHer() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("signup");

  if (user === undefined) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bur5 }}>
        <div style={{ textAlign: "center" }}>
          <div className="shimmer-effect" style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur3})`, margin: "0 auto 16px" }} />
          <div className="serif gradient-text" style={{ fontSize: 28, fontWeight: 600 }}>TrackHER</div>
          <p style={{ fontSize: 14, color: C.txt3, marginTop: 8 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage
          onGetStarted={() => { setAuthMode("signup"); setShowAuthModal(true); }}
          onLogin={() => { setAuthMode("signin"); setShowAuthModal(true); }}
        />
        {showAuthModal && <AuthModal mode={authMode} onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
      </>
    );
  }

  return <Dashboard />;
}