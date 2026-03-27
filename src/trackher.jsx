// trackher.jsx
import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { signUp, signIn, signInWithGoogle, logOut } from "./auth";
import { useAuth } from "./AuthContext";
import { saveDailyLog, saveCycleSettings, getCycleSettings } from "./db";
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
  const id = "trackher-styles";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; font-family: 'DM Sans', sans-serif; background: #fdf2f4; color: #1a0a0d; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #fdf2f4; }
    ::-webkit-scrollbar-thumb { background: #e8b4bf; border-radius: 2px; }
    .serif { font-family: 'DM Serif Display', serif; }
    .fade-in { animation: fadeIn 0.4s ease forwards; }
    .slide-up { animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
    @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
    @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .btn-primary {
      background: #7d1f2e; color: #fdf2f4; border: none; border-radius: 12px;
      padding: 11px 22px; font-family: 'DM Sans', sans-serif; font-size: 14px;
      font-weight: 500; cursor: pointer; transition: background 0.15s, transform 0.1s;
      display: inline-flex; align-items: center; gap: 7px;
    }
    .btn-primary:hover { background: #a8354a; }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    .btn-secondary {
      background: #f5e2e6; color: #7d1f2e; border: none; border-radius: 12px;
      padding: 11px 22px; font-family: 'DM Sans', sans-serif; font-size: 14px;
      font-weight: 500; cursor: pointer; transition: background 0.15s;
    }
    .btn-secondary:hover { background: #e8b4bf; }
    .card {
      background: #fff; border-radius: 16px;
      border: 0.5px solid rgba(125,31,46,0.1);
      box-shadow: 0 1px 4px rgba(125,31,46,0.06);
    }
    .input-field {
      width: 100%; background: #fdf2f4; border: 1.5px solid #f5e2e6;
      border-radius: 12px; padding: 11px 14px; font-family: 'DM Sans', sans-serif;
      font-size: 14px; color: #1a0a0d; outline: none; transition: border-color 0.15s;
    }
    .input-field:focus { border-color: #c4607a; background: #fff; }
    .input-field::placeholder { color: #b87a86; }
    .input-field:disabled { opacity: 0.6; cursor: not-allowed; }
    .phase-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .tag {
      display: inline-flex; align-items: center; padding: 4px 10px;
      border-radius: 20px; font-size: 11px; font-weight: 500;
    }
  `;
  document.head.appendChild(el);
})();

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const mockUser = { name: "Priya", email: "priya@example.com", cycleLength: 28, periodDuration: 5 };

const trendData = [
  { day: "Mon", mood: 7, sleep: 7.5, stress: 4, pms: 20 },
  { day: "Tue", mood: 6, sleep: 6.8, stress: 5, pms: 25 },
  { day: "Wed", mood: 5, sleep: 6.2, stress: 7, pms: 42 },
  { day: "Thu", mood: 4, sleep: 5.9, stress: 8, pms: 58 },
  { day: "Fri", mood: 5, sleep: 7.1, stress: 6, pms: 65 },
  { day: "Sat", mood: 6, sleep: 7.8, stress: 4, pms: 55 },
  { day: "Sun", mood: 7, sleep: 8.2, stress: 3, pms: 40 },
];

const chatHistory = [
  { role: "assistant", text: "Hey Pretty 🎀 I'm your cycle health assistant. Ask me anything about your symptoms, cycle phases, nutrition, or how you're feeling today." },
];

const symptoms = ["Cramps", "Fatigue", "Bloating", "Headache", "Mood swings", "Back pain", "Tender breasts", "Nausea", "Acne", "Cravings"];

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
const Icon = {
  home: (active) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 7.5L9 2l7 5.5V16a1 1 0 01-1 1H3a1 1 0 01-1-1V7.5z"
        stroke={active ? C.bur : C.txt3} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? C.bur5 : "none"} />
      <rect x="6.5" y="11" width="5" height="6" rx="1"
        stroke={active ? C.bur : C.txt3} strokeWidth="1.4" />
    </svg>
  ),
  calendar: (active) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1.5" y="3" width="15" height="13.5" rx="2"
        stroke={active ? C.bur : C.txt3} strokeWidth="1.4" />
      <line x1="6" y1="1" x2="6" y2="5" stroke={active ? C.bur : C.txt3} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="1" x2="12" y2="5" stroke={active ? C.bur : C.txt3} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="1.5" y1="7.5" x2="16.5" y2="7.5" stroke={active ? C.bur : C.txt3} strokeWidth="1.4" />
    </svg>
  ),
  trends: (active) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <polyline points="2,14 5,9 8,11 12,6 16,9"
        stroke={active ? C.bur : C.txt3} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  insights: (active) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="8" r="4.5" stroke={active ? C.bur : C.txt3} strokeWidth="1.4" />
      <line x1="9" y1="13" x2="9" y2="16" stroke={active ? C.bur : C.txt3} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7" y1="16" x2="11" y2="16" stroke={active ? C.bur : C.txt3} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="9" y1="6" x2="9" y2="8.5" stroke={active ? C.bur : C.txt3} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="10" r="0.8" fill={active ? C.bur : C.txt3} />
    </svg>
  ),
  chat: (active) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 3.5A1.5 1.5 0 013.5 2h11A1.5 1.5 0 0116 3.5v8A1.5 1.5 0 0114.5 13H5l-3 3V3.5z"
        stroke={active ? C.bur : C.txt3} strokeWidth="1.4" strokeLinejoin="round"
        fill={active ? C.bur5 : "none"} />
    </svg>
  ),
  profile: (active) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="6.5" r="3.5" stroke={active ? C.bur : C.txt3} strokeWidth="1.4" />
      <path d="M2 16.5c0-3.314 3.134-5.5 7-5.5s7 2.186 7 5.5"
        stroke={active ? C.bur : C.txt3} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  bell: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2a5 5 0 015 5v3l1.5 2.5H2.5L4 10V7a5 5 0 015-5z"
        stroke={C.txt3} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 14.5a2 2 0 004 0" stroke={C.txt3} strokeWidth="1.4" />
    </svg>
  ),
  add: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  arrow: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="9,3 14,8 9,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  send: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13 8L3 3l2.5 5L3 13l10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  close: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  spark: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2l1.3 3.7L13 7l-3.7 1.3L8 12l-1.3-3.7L3 7l3.7-1.3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  ),
};

/* ─────────────────────────────────────────────
   PHASE helpers
───────────────────────────────────────────── */
const phaseColors = {
  period:     { bg: "#fce4e8", text: C.bur, label: "Menstrual" },
  follicular: { bg: "#fce8f0", text: C.bur2, label: "Follicular" },
  ovulation:  { bg: C.bur,    text: "#fdf2f4", label: "Ovulation" },
  luteal:     { bg: "#f7eef0", text: C.txt3, label: "Luteal" },
};
function getPhase(day) {
  if (day >= 1 && day <= 5)  return "period";
  if (day >= 6 && day <= 12) return "follicular";
  if (day >= 13 && day <= 15) return "ovulation";
  return "luteal";
}

/* ─────────────────────────────────────────────
   ░░░  LANDING PAGE  ░░░
───────────────────────────────────────────── */
function LandingPage({ onGetStarted, onLogin }) {
  const features = [
    {title: "ML-Powered Predictions", desc: "Our model learns your unique cycle pattern and gets smarter with every log." },
    {title: "Cycle Calendar", desc: "Colour-coded phases — menstrual, follicular, ovulation, luteal — all at a glance." },
    {title: "Trend Insights", desc: "Track how sleep, stress, mood, and PMS risk shift across your cycle." },
    {title: "AI Health Assistant", desc: "Ask anything — symptoms, nutrition, phases — and get empathetic answers." },
    {title: "Smart Reminders", desc: "Period approaching? Get notified before it sneaks up on you." },
    {title: "Completely Private", desc: "Your data is yours. Never shared, never sold. Ever." },
  ];
  const testimonials = [
    { name: "Rhea M.", text: "Finally an app that actually understands my body. The predictions have been spot-on." },
    { name: "Ananya S.", text: "The AI assistant answered questions I was too embarrassed to Google. Life-changing." },
    { name: "Divya K.", text: "I've tried Flo and Clue — TrackHER feels more personal and less clinical." },
  ];
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: C.txt, overflowX: "hidden" }}>
      {/* NAV */}
      <nav style={{ background: "#fff", borderBottom: `0.5px solid rgba(125,31,46,0.1)`, padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span className="serif" style={{ fontSize: 22, color: C.bur, letterSpacing: "-0.5px" }}>TrackHER</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-secondary" style={{ padding: "8px 18px", fontSize: 13 }} onClick={onLogin}>Sign in</button>
          <button className="btn-primary" style={{ padding: "8px 18px", fontSize: 13 }} onClick={onGetStarted}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: `linear-gradient(160deg, ${C.bur} 0%, ${C.bur2} 50%, ${C.bur3} 100%)`, padding: "80px 40px 0", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 70%)" }} />
        <div style={{ maxWidth: 620, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", color: C.bur5, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, marginBottom: 24 }}>
            <span>✦</span> ML-powered cycle intelligence
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(36px, 6vw, 58px)", color: "#fdf2f4", lineHeight: 1.1, marginBottom: 20, letterSpacing: "-1px" }}>
            Your cycle,<br />understood deeply.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(253,242,244,0.75)", lineHeight: 1.7, marginBottom: 36, maxWidth: 500, margin: "0 auto 36px" }}>
            TrackHER learns your unique pattern to predict periods, ovulation, and PMS risk — with empathy, not just data.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" style={{ background: "#fff", color: C.bur, fontSize: 15, padding: "13px 28px" }} onClick={onGetStarted}>
              Start tracking free {Icon.arrow()}
            </button>
            <button style={{ background: "rgba(255,255,255,0.12)", color: C.bur5, border: "none", borderRadius: 12, padding: "13px 22px", fontSize: 15, cursor: "pointer" }} onClick={onLogin}>
              I already have an account
            </button>
          </div>
          {/* APP PREVIEW MOCKUP */}
          <div style={{ marginTop: 56, display: "flex", justifyContent: "center", gap: 16, perspective: 1000, paddingBottom: 0 }}>
            <div style={{ width: 200, background: C.bur5, borderRadius: 28, border: `5px solid #1a0a0d`, overflow: "hidden", boxShadow: "0 32px 64px rgba(0,0,0,0.35)", transform: "rotateY(-6deg) rotateX(2deg)", flexShrink: 0 }}>
              <div style={{ background: C.bur, padding: "7px 12px 0", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.bur5, fontSize: 8, fontWeight: 500 }}>9:41</span>
                <span style={{ color: C.bur5, fontSize: 8 }}>●●●</span>
              </div>
              <div style={{ background: C.bur, padding: "0 12px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="serif" style={{ color: C.bur5, fontSize: 15 }}>TrackHER</span>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.bur4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: C.bur }}>P</div>
              </div>
              <div style={{ background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, margin: 8, borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 7, color: C.bur4, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Cycle day</div>
                <div className="serif" style={{ color: C.bur5, fontSize: 24, lineHeight: 1 }}>Day 14</div>
                <div style={{ fontSize: 8, color: "rgba(253,242,244,0.7)", margin: "3px 0 6px" }}>Ovulation window</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <span style={{ background: "rgba(255,255,255,0.15)", color: C.bur5, padding: "2px 7px", borderRadius: 8, fontSize: 7, fontWeight: 500 }}>28 day cycle</span>
                  <span style={{ background: C.bur4, color: C.bur, padding: "2px 7px", borderRadius: 8, fontSize: 7, fontWeight: 500 }}>Fertile now</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, margin: "0 8px 8px" }}>
                {[["Mar 27", "Next period"], ["72%", "PMS risk"]].map(([val, lbl]) => (
                  <div key={lbl} style={{ background: "#fff", borderRadius: 8, padding: "6px 8px", border: `0.5px solid rgba(125,31,46,0.08)` }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: C.txt }}>{val}</div>
                    <div style={{ fontSize: 7.5, color: C.txt3 }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <button style={{ margin: "0 8px 6px", width: "calc(100% - 16px)", background: C.bur, color: C.bur5, border: "none", borderRadius: 8, padding: "8px", fontSize: 10, fontWeight: 500, cursor: "pointer" }}>
                + Log today
              </button>
              <div style={{ background: "#fff", borderTop: `0.5px solid rgba(125,31,46,0.1)`, display: "flex", justifyContent: "space-around", padding: "6px 0 8px" }}>
                {["Home", "Calendar", "Trends", "Me"].map((n, i) => (
                  <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: 12, height: 3, borderRadius: 1.5, background: i === 0 ? C.bur : C.bur4 }} />
                    <span style={{ fontSize: 6.5, color: i === 0 ? C.bur : C.txt3, fontWeight: 500 }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "80px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.bur3, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>EVERYTHING YOU NEED</p>
            <h2 className="serif" style={{ fontSize: "clamp(26px, 4vw, 40px)", color: C.txt, letterSpacing: "-0.5px" }}>Built for your whole cycle,<br />not just your period</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {features.map(f => (
              <div key={f.title} className="card" style={{ padding: "24px 22px" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.txt, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: C.txt2, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 40px", background: C.bur5 }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.bur3, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>HOW IT WORKS</p>
          <h2 className="serif" style={{ fontSize: "clamp(26px, 4vw, 38px)", color: C.txt, marginBottom: 48, letterSpacing: "-0.5px" }}>Three steps to knowing yourself</h2>
          {[
            { num: "01", title: "Log your last period", desc: "Tell us when your last period started. Just that one date gets you started." },
            { num: "02", title: "Track daily how you feel", desc: "30 seconds — log flow, mood, sleep, stress. The more you log, the smarter the model." },
            { num: "03", title: "Let the ML do the work", desc: "Predictions improve automatically. Your cycle, your data, your patterns." },
          ].map((s, i) => (
            <div key={s.num} style={{ display: "flex", gap: 24, alignItems: "flex-start", textAlign: "left", marginBottom: i < 2 ? 36 : 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.bur, color: C.bur5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span className="serif" style={{ fontSize: 16 }}>{s.num}</span>
              </div>
              <div style={{ paddingTop: 6 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: C.txt2, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "80px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", textAlign: "center", color: C.txt, marginBottom: 48, letterSpacing: "-0.5px" }}>Women who trust TrackHER</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {testimonials.map(t => (
              <div key={t.name} className="card" style={{ padding: "24px", borderLeft: `3px solid ${C.bur4}` }}>
                <p style={{ fontSize: 13.5, color: C.txt2, lineHeight: 1.7, marginBottom: 16, fontStyle: "italic" }}>"{t.text}"</p>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.bur }}>— {t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section style={{ background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, padding: "80px 40px", textAlign: "center" }}>
        <h2 className="serif" style={{ fontSize: "clamp(28px, 4vw, 44px)", color: C.bur5, marginBottom: 16, letterSpacing: "-0.5px" }}>Ready to understand your cycle?</h2>
        <p style={{ color: "rgba(253,242,244,0.75)", fontSize: 15, marginBottom: 36 }}>Free forever. No credit card. Just you and your data.</p>
        <button className="btn-primary" style={{ background: "#fff", color: C.bur, fontSize: 15, padding: "14px 32px" }} onClick={onGetStarted}>
          Create your account {Icon.arrow()}
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.txt, padding: "28px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span className="serif" style={{ color: C.bur5, fontSize: 18 }}>TrackHER</span>
        <span style={{ color: C.txt3, fontSize: 12 }}>© 2026 · Built with care for women everywhere</span>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  AUTH PAGE  ░░░
───────────────────────────────────────────── */
function AuthPage({ mode, onSwitch, onSuccess, onBack }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLogin = mode === "login";

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

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(form.email, form.password);
      } else {
        await signUp(form.name, form.email, form.password);
      }
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bur5, display: "flex", flexDirection: "column" }}>
      <nav style={{ padding: "16px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.txt3, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
          ← Back
        </button>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div className="card fade-in" style={{ width: "100%", maxWidth: 400, padding: "40px 36px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span className="serif" style={{ fontSize: 24, color: C.bur }}>TrackHER</span>
            <h1 className="serif" style={{ fontSize: 26, color: C.txt, marginTop: 16, letterSpacing: "-0.5px" }}>
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p style={{ fontSize: 13, color: C.txt3, marginTop: 6 }}>
              {isLogin ? "Sign in to continue tracking" : "Start understanding your cycle"}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.txt2, display: "block", marginBottom: 5 }}>Full name</label>
                <input
                  className="input-field"
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  disabled={loading}
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.txt2, display: "block", marginBottom: 5 }}>Email address</label>
              <input
                className="input-field"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={loading}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.txt2, display: "block", marginBottom: 5 }}>Password</label>
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                disabled={loading}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
              />
            </div>

            {isLogin && (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 12, color: C.bur, cursor: "pointer" }}>Forgot password?</span>
              </div>
            )}

            {error && (
              <div style={{ background: "#fff0f2", border: `1px solid ${C.bur4}`, borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 12.5, color: C.bur, margin: 0 }}>⚠️ {error}</p>
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: 14, marginTop: 4, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: C.bur6 }} />
              <span style={{ fontSize: 11, color: C.txt3 }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: C.bur6 }} />
            </div>

            <button
              style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.bur6}`, borderRadius: 12, padding: "11px", fontSize: 13, color: C.txt, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1 }}
              onClick={handleGoogle}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107" />
                <path d="M6.3 14.7l7 5.1C15 16.5 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.6 7.3 6.3 14.7z" fill="#FF3D00" />
                <path d="M24 46c5.5 0 10.5-1.9 14.4-5.1l-6.6-5.5C29.8 37 27 38 24 38c-5.8 0-10.7-3.9-12.4-9.3l-7 5.4C8.1 42.1 15.6 46 24 46z" fill="#4CAF50" />
                <path d="M44.5 20H24v8.5h11.8c-1 2.9-3 5.3-5.7 6.9l6.6 5.5C41.7 37.5 44.5 31.5 44.5 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2" />
              </svg>
              Continue with Google
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: C.txt3, marginTop: 24 }}>
            {isLogin ? "New to TrackHER?" : "Already have an account?"}{" "}
            <span style={{ color: C.bur, cursor: "pointer", fontWeight: 500 }} onClick={onSwitch}>
              {isLogin ? "Create account" : "Sign in"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  LOG MODAL  ░░░
───────────────────────────────────────────── */
function LogModal({ onClose, uid }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    lastPeriod: "", flow: 1, symptoms: [],
    mood: 7, sleep: 7.5, stress: 3, energy: 7, notes: ""
  });
  const steps = ["Period", "Symptoms", "Wellbeing", "Done"];

  const toggleSymptom = (s) => {
    setData(d => ({
      ...d, symptoms: d.symptoms.includes(s) ? d.symptoms.filter(x => x !== s) : [...d.symptoms, s]
    }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(26,10,13,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="slide-up" style={{ background: "#fff", borderRadius: "24px 24px 0 0", padding: "24px 24px 40px", position: "relative", maxHeight: "85vh", overflowY: "auto", maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="serif" style={{ fontSize: 20, color: C.txt }}>Log today</h2>
          <button onClick={onClose} style={{ background: C.bur5, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.txt2 }}>
            {Icon.close()}
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.bur : C.bur6, transition: "background 0.3s" }} />
          ))}
        </div>

        {step === 0 && (
          <div className="fade-in">
            <p style={{ fontSize: 13, color: C.txt3, marginBottom: 16 }}>When did your last period start?</p>
            <input type="date" className="input-field" style={{ marginBottom: 20 }} value={data.lastPeriod}
              onChange={e => setData(d => ({ ...d, lastPeriod: e.target.value }))} />
            <p style={{ fontSize: 13, color: C.txt2, marginBottom: 10, fontWeight: 500 }}>Flow intensity today</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {[["Light", 0], ["Moderate", 1], ["Heavy", 2]].map(([lbl, val]) => (
                <button key={lbl} onClick={() => setData(d => ({ ...d, flow: val }))} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${data.flow === val ? C.bur : C.bur6}`,
                  background: data.flow === val ? C.bur5 : "#fff", color: data.flow === val ? C.bur : C.txt2,
                  fontSize: 12, fontWeight: data.flow === val ? 600 : 400, cursor: "pointer"
                }}>{lbl}</button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <p style={{ fontSize: 13, color: C.txt3, marginBottom: 14 }}>Any symptoms today? Select all that apply</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {symptoms.map(s => (
                <button key={s} onClick={() => toggleSymptom(s)} style={{
                  padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${data.symptoms.includes(s) ? C.bur : C.bur6}`,
                  background: data.symptoms.includes(s) ? C.bur5 : "#fff", color: data.symptoms.includes(s) ? C.bur : C.txt2,
                  fontSize: 12, fontWeight: data.symptoms.includes(s) ? 600 : 400, cursor: "pointer"
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { label: "Mood", key: "mood", low: "😔", high: "😊" },
              { label: "Energy", key: "energy", low: "🔋", high: "⚡" },
              { label: "Stress", key: "stress", low: "😌", high: "😤" },
            ].map(({ label, key, low, high }) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.txt2 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.bur }}>{data[key]}/10</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{low}</span>
                  <input type="range" min="1" max="10" value={data[key]}
                    onChange={e => setData(d => ({ ...d, [key]: +e.target.value }))}
                    style={{ flex: 1, accentColor: C.bur }} />
                  <span>{high}</span>
                </div>
              </div>
            ))}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: C.txt2, display: "block", marginBottom: 6 }}>Hours of sleep</label>
              <input type="number" min="0" max="14" step="0.5" className="input-field" value={data.sleep}
                onChange={e => setData(d => ({ ...d, sleep: +e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: C.txt2, display: "block", marginBottom: 6 }}>Any notes?</label>
              <textarea className="input-field" rows={3} placeholder="Optional — anything worth noting today..."
                value={data.notes} onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
                style={{ resize: "none" }} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in" style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🌸</div>
            <h3 className="serif" style={{ fontSize: 22, color: C.txt, marginBottom: 8 }}>All logged!</h3>
            <p style={{ fontSize: 13.5, color: C.txt2, lineHeight: 1.6 }}>Your cycle model has been updated. Predictions will keep improving as you log more.</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {step > 0 && step < 3 && (
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          {step < 2 && (
            <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep(s => s + 1)}>Continue</button>
          )}
          {step === 2 && (
            <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={async () => {
              if (uid) {
                const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
                 await saveDailyLog(uid, today, {
                  flow: data.flow,
                  symptoms: data.symptoms,
                  mood: data.mood,
                  energy: data.energy,
                  stress: data.stress,
                  sleep: data.sleep,
                  notes: data.notes,
                });
                // If they entered a last period date, save it to cycle settings too
                if (data.lastPeriod) {
                  await saveCycleSettings(uid, {
                    lastPeriodDate: data.lastPeriod,
                    cycleLength: 28, // default for now, will be dynamic in Step 11
                    periodDuration: 5,
                  });
                }}
                setStep(3);
              }}>Save log</button>
            )}
          {step === 3 && (
            <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  CALENDAR  ░░░
───────────────────────────────────────────── */
function buildCalendar(year, month, cycleStart, cycleLen) {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const cycleDay = ((d - cycleStart + cycleLen) % cycleLen) + 1;
    cells.push({ day: d, cycleDay, phase: getPhase(cycleDay) });
  }
  return cells;
}

/* ─────────────────────────────────────────────
   ░░░  DASHBOARD PAGE  ░░░
───────────────────────────────────────────── */
function Dashboard({ onLogOpen, user }) {
  const [cycleData, setCycleData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      const settings = await getCycleSettings(user.uid);
      if (settings) {
        const cycleDay = getCycleDay(settings.lastPeriodDate, settings.cycleLength);
        const nextPeriod = getNextPeriodDate(settings.lastPeriodDate, settings.cycleLength);
        const pmsRisk = getPMSRisk(cycleDay, settings.cycleLength);
        const phase = getPhaseFromDay(cycleDay, settings.cycleLength);
        const phaseInfo = getPhaseInfo(phase);
        const daysUntil = getDaysUntilNextPeriod(settings.lastPeriodDate, settings.cycleLength);
        setCycleData({
          cycleDay,
          nextPeriod: formatDate(nextPeriod),
          pmsRisk,
          phase,
          phaseInfo,
          daysUntil,
          cycleLength: settings.cycleLength || 28,
          lastPeriodDate: settings.lastPeriodDate,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Use real data if available, fallback to prompting user to log
  const cycleDay = cycleData?.cycleDay || null;
  const phase = cycleData?.phase || "unknown";
  const phaseInfo = getPhaseInfo(phase);
  const cells = buildCalendar(
    new Date().getFullYear(),
    new Date().getMonth(),
    cycleData?.lastPeriodDate ? new Date(cycleData.lastPeriodDate).getDate() : 1,
    cycleData?.cycleLength || 28
  );

  const userName = user?.displayName || user?.email?.split("@")[0] || "there";

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <p style={{ color: C.txt3, fontSize: 13 }}>Loading your cycle data...</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: "24px 24px 100px" }}>
      <p style={{ fontSize: 12, color: C.txt3, marginBottom: 2 }}>Good morning, {userName} ✨</p>
      <h1 className="serif" style={{ fontSize: 26, color: C.txt, marginBottom: 20, letterSpacing: "-0.5px" }}>Your cycle dashboard</h1>

      {/* No data state */}
      {!cycleData && (
        <div style={{ background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, borderRadius: 18, padding: "28px 24px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
          <h2 className="serif" style={{ fontSize: 22, color: C.bur5, marginBottom: 8 }}>Welcome to TrackHER!</h2>
          <p style={{ fontSize: 13, color: "rgba(253,242,244,0.8)", marginBottom: 20, lineHeight: 1.6 }}>
            Log your last period date to start seeing your cycle predictions, phases, and insights.
          </p>
          <button className="btn-primary" style={{ background: "#fff", color: C.bur }} onClick={onLogOpen}>
            {Icon.add()} Log your first period
          </button>
        </div>
      )}

      {/* Hero Card — only show when we have data */}
      {cycleData && (
        <div style={{ background: `linear-gradient(135deg, ${C.bur} 0%, ${C.bur2} 60%, ${C.bur3} 100%)`, borderRadius: 18, padding: "22px 20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, color: C.bur4, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 4 }}>Cycle day</div>
              <div className="serif" style={{ fontSize: 48, color: C.bur5, lineHeight: 1 }}>Day {cycleDay}</div>
              <div style={{ fontSize: 12, color: "rgba(253,242,244,0.7)", marginTop: 5 }}>{phaseInfo.label} phase · {phaseInfo.tip.split(".")[0]}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              <span style={{ background: "rgba(255,255,255,0.14)", color: C.bur5, padding: "5px 11px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}>{cycleData.cycleLength} day cycle</span>
              <span style={{ background: C.bur4, color: C.bur, padding: "5px 11px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{phaseInfo.emoji} {phaseInfo.label}</span>
              <span style={{ background: "rgba(255,255,255,0.14)", color: C.bur5, padding: "5px 11px", borderRadius: 12, fontSize: 11 }}>Next: {cycleData.nextPeriod}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          [cycleData?.nextPeriod || "—", "Next period", "📅"],
          [cycleData ? `${cycleData.pmsRisk}%` : "—", "PMS risk", "⚠️"],
          [cycleData ? `${cycleData.daysUntil}d away` : "—", "Days left", "⏳"],
        ].map(([val, lbl, ico]) => (
          <div key={lbl} className="card" style={{ padding: "14px 12px" }}>
            <div style={{ fontSize: 9, marginBottom: 4 }}>{ico}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.txt, marginBottom: 2 }}>{val}</div>
            <div style={{ fontSize: 10, color: C.txt3 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Phase Legend */}
      <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.txt, marginBottom: 10 }}>CYCLE PHASES</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(phaseColors).map(([key, { bg, text, label }]) => (
            <span key={key} style={{ background: bg, color: text, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: key === phase ? 700 : 400, border: key === phase ? `1.5px solid ${text}` : "1.5px solid transparent" }}>
              {label}{key === phase ? " ←" : ""}
            </span>
          ))}
        </div>
      </div>

      {/* Mini Calendar */}
      <div className="card" style={{ padding: "16px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h3>
          <span style={{ fontSize: 11, color: C.bur2, cursor: "pointer" }}>Full calendar →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 9, color: C.txt3, padding: "2px 0", fontWeight: 500 }}>{d}</div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} />;
            const pc = phaseColors[cell.phase];
            const isToday = cell.day === new Date().getDate();
            return (
              <div key={i} style={{
                aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: cell.phase === "ovulation" ? "50%" : 5, fontSize: 9,
                background: isToday ? C.bur : pc.bg, color: isToday ? "#fff" : pc.text,
                fontWeight: isToday ? 700 : 400,
              }}>{cell.day}</div>
            );
          })}
        </div>
      </div>

      {/* Cycle Insight */}
      <div style={{ background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, borderRadius: 14, padding: "16px 18px" }}>
        <div style={{ fontSize: 9, color: C.bur4, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
          {Icon.spark()} Cycle Insight
        </div>
        <p style={{ fontSize: 13, color: "rgba(253,242,244,0.88)", lineHeight: 1.5 }}>
          {phaseInfo.tip} {cycleData ? `You're on day ${cycleDay} of your ${cycleData.cycleLength}-day cycle.` : "Log your period to get personalised insights."}
        </p>
      </div>

      {/* FAB */}
      <button onClick={onLogOpen} style={{
        position: "fixed", bottom: 80, right: 20, width: 54, height: 54,
        borderRadius: "50%", background: C.bur, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        boxShadow: `0 4px 16px rgba(125,31,46,0.4)`, zIndex: 200
      }}>
        {Icon.add()}
      </button>
    </div>
  );
}
/* ─────────────────────────────────────────────
   ░░░  CALENDAR PAGE  ░░░
───────────────────────────────────────────── */
function CalendarPage() {
  const [viewMonth, setViewMonth] = useState({ year: 2026, month: 2 });
  const cells = buildCalendar(viewMonth.year, viewMonth.month, 1, 28);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const prevMonth = () => setViewMonth(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setViewMonth(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  return (
    <div className="fade-in" style={{ padding: "24px 16px 100px" }}>
      <h1 className="serif" style={{ fontSize: 26, color: C.txt, marginBottom: 6, letterSpacing: "-0.5px" }}>Calendar</h1>
      <p style={{ fontSize: 12, color: C.txt3, marginBottom: 20 }}>Your full cycle view</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {Object.entries(phaseColors).map(([key, { bg, text, label }]) => (
          <span key={key} style={{ background: bg, color: text, padding: "3px 9px", borderRadius: 16, fontSize: 10, fontWeight: 500 }}>{label}</span>
        ))}
      </div>

      <div className="card" style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ background: C.bur5, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="9,2 4,7 9,12" stroke={C.bur} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h2 className="serif" style={{ fontSize: 18, color: C.txt }}>{monthNames[viewMonth.month]} {viewMonth.year}</h2>
          <button onClick={nextMonth} style={{ background: C.bur5, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="5,2 10,7 5,12" stroke={C.bur} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 9, color: C.txt3, padding: "3px 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>{d}</div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} style={{ aspectRatio: "1" }} />;
            const pc = phaseColors[cell.phase];
            const isToday = cell.day === 26 && viewMonth.month === 2;
            return (
              <div key={i} style={{
                aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                borderRadius: cell.phase === "ovulation" ? "50%" : 8,
                background: isToday ? C.bur : pc.bg,
                color: isToday ? "#fff" : pc.text, cursor: "pointer",
                transition: "transform 0.1s",
              }}>
                <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400 }}>{cell.day}</span>
                <span style={{ fontSize: 7, opacity: 0.7 }}>d{cell.cycleDay}</span>
              </div>
            );
          })}
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: C.txt, margin: "20px 0 10px" }}>Upcoming</h3>
      {[
        { icon: "🔴", label: "Next period", date: "Mar 27", color: C.bur },
        { icon: "💚", label: "Fertile window starts", date: "Apr 5", color: "#2d7a4f" },
        { icon: "⭕", label: "Ovulation", date: "Apr 11", color: C.bur2 },
        { icon: "🟡", label: "PMS window", date: "Apr 17–27", color: "#9c6000" },
      ].map(e => (
        <div key={e.label} className="card" style={{ padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>{e.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: e.color }}>{e.label}</div>
          </div>
          <span style={{ fontSize: 12, color: C.txt3, fontWeight: 500 }}>{e.date}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  TRENDS PAGE  ░░░
───────────────────────────────────────────── */
function TrendsPage() {
  const [activeMetric, setActiveMetric] = useState("mood");
  const metrics = [
    { key: "mood", label: "Mood", color: C.bur3, unit: "/10" },
    { key: "sleep", label: "Sleep", color: "#4a90d9", unit: "hrs" },
    { key: "stress", label: "Stress", color: "#d97a4a", unit: "/10" },
    { key: "pms", label: "PMS Risk", color: C.bur, unit: "%" },
  ];
  const active = metrics.find(m => m.key === activeMetric);

  return (
    <div className="fade-in" style={{ padding: "24px 16px 100px" }}>
      <h1 className="serif" style={{ fontSize: 26, color: C.txt, marginBottom: 6, letterSpacing: "-0.5px" }}>Trends</h1>
      <p style={{ fontSize: 12, color: C.txt3, marginBottom: 20 }}>How your cycle affects your body</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {metrics.map(m => (
          <button key={m.key} onClick={() => setActiveMetric(m.key)} style={{
            padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${activeMetric === m.key ? m.color : C.bur6}`,
            background: activeMetric === m.key ? m.color : "#fff", color: activeMetric === m.key ? "#fff" : C.txt2,
            fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap"
          }}>{m.label}</button>
        ))}
      </div>

      <div className="card" style={{ padding: "16px", marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: C.txt, marginBottom: 4 }}>{active.label} — this week</h3>
        <p style={{ fontSize: 11, color: C.txt3, marginBottom: 14 }}>Avg: {active.key === "pms" ? "43%" : active.key === "sleep" ? "7.1 hrs" : `${(trendData.reduce((a, d) => a + d[active.key], 0) / 7).toFixed(1)}/10`}</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={active.color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={active.color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,31,46,0.05)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: C.txt3 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.txt3 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: `0.5px solid ${C.bur4}`, fontSize: 12 }} />
            <Area type="monotone" dataKey={active.key} stroke={active.color} fill="url(#trendGrad)" strokeWidth={2} dot={{ r: 3, fill: active.color }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: C.txt, marginBottom: 12 }}>All metrics this week</h3>
      <div className="card" style={{ padding: "16px" }}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,31,46,0.05)" />
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: C.txt3 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: C.txt3 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: `0.5px solid ${C.bur4}`, fontSize: 11 }} />
            <Line type="monotone" dataKey="mood" stroke={C.bur3} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="sleep" stroke="#4a90d9" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="stress" stroke="#d97a4a" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8 }}>
          {[["Mood", C.bur3], ["Sleep", "#4a90d9"], ["Stress", "#d97a4a"]].map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 2, background: c, borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: C.txt3 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, borderRadius: 14, padding: "16px 18px", marginTop: 16 }}>
        <div style={{ fontSize: 10, color: C.bur4, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>Pattern detected</div>
        <p style={{ fontSize: 13, color: "rgba(253,242,244,0.88)", lineHeight: 1.6 }}>
          Your stress peaks on cycle days 22–26. This aligns with your higher PMS scores. Try stress-reducing activities during this window.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  INSIGHTS PAGE  ░░░
───────────────────────────────────────────── */
function InsightsPage() {
  const insights = [
    { title: "Cycle regularity", value: "Regular", desc: "Your cycle has been consistent at 27–29 days for the last 3 months.", confidence: 91 },
    { title: "Sleep & PMS link", value: "Strong", desc: "When you sleep under 6.5 hours, your PMS score increases by an avg of 23%.", confidence: 87 },
    { title: "Exercise effect", value: "Positive", desc: "Logging exercise days correlates with 18% lower cramp severity on period day 1.", confidence: 78 },
    { title: "Stress patterns", value: "Luteal peak", desc: "Your stress scores are consistently highest in days 22–26 of your cycle.", confidence: 93 },
  ];

  return (
    <div className="fade-in" style={{ padding: "24px 16px 100px" }}>
      <h1 className="serif" style={{ fontSize: 26, color: C.txt, marginBottom: 6, letterSpacing: "-0.5px" }}>Insights</h1>
      <p style={{ fontSize: 12, color: C.txt3, marginBottom: 8 }}>ML-powered patterns from your data</p>

      <div style={{ background: C.bur6, borderRadius: 12, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13 }}>🎀</span>
        <p style={{ fontSize: 12, color: C.txt2, lineHeight: 1.5 }}>Insights improve as you log more. You need 3+ full cycles for high-confidence predictions.</p>
      </div>

      {insights.map(ins => (
        <div key={ins.title} className="card" style={{ padding: "18px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{ins.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>{ins.title}</h3>
                <span style={{ background: C.bur5, color: C.bur, padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>{ins.value}</span>
              </div>
              <p style={{ fontSize: 12.5, color: C.txt2, lineHeight: 1.6, marginBottom: 8 }}>{ins.desc}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 3, background: C.bur6, borderRadius: 2 }}>
                  <div style={{ width: `${ins.confidence}%`, height: "100%", background: C.bur3, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 10, color: C.txt3, fontWeight: 500 }}>{ins.confidence}% confidence</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <h3 style={{ fontSize: 14, fontWeight: 600, color: C.txt, margin: "20px 0 10px" }}>Phase guide</h3>
      {[
        { phase: "Menstrual", days: "Days 1–5", tip: "Rest, iron-rich foods, gentle movement. Your body is shedding.", color: C.bur },
        { phase: "Follicular", days: "Days 6–12", tip: "Energy rising. Great time to start new projects and social plans.", color: C.bur2 },
        { phase: "Ovulation", days: "Days 13–15", tip: "Peak energy and communication. Confidence is highest now.", color: C.bur3 },
        { phase: "Luteal", days: "Days 16–28", tip: "Slow down, prepare. Cravings and mood shifts are normal.", color: C.txt2 },
      ].map(p => (
        <div key={p.phase} className="card" style={{ padding: "14px 16px", marginBottom: 10, borderLeft: `3px solid ${p.color}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.phase}</span>
            <span style={{ fontSize: 11, color: C.txt3 }}>{p.days}</span>
          </div>
          <p style={{ fontSize: 12, color: C.txt2, lineHeight: 1.5 }}>{p.tip}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  CHATBOT PAGE  ░░░
───────────────────────────────────────────── */
function ChatbotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! 🎀 I'm your cycle health assistant. Ask me anything about your symptoms, cycle phases, nutrition, or how you're feeling today." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cycleContext, setCycleContext] = useState(null);
  const bottomRef = useRef(null);

  const suggestions = [
    "What should I eat during my period?",
    "Why do I feel so tired on day 1?",
    "What helps with cramps?",
    "How do I manage PMS mood swings?",
  ];

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      const settings = await getCycleSettings(user.uid);
      if (settings) {
        const cycleDay = getCycleDay(settings.lastPeriodDate, settings.cycleLength);
        const phase = getPhaseFromDay(cycleDay, settings.cycleLength);
        const pmsRisk = getPMSRisk(cycleDay, settings.cycleLength);
        const nextPeriod = getNextPeriodDate(settings.lastPeriodDate, settings.cycleLength);
        setCycleContext({
          cycleDay,
          phase,
          pmsRisk,
          nextPeriod: formatDate(nextPeriod),
          cycleLength: settings.cycleLength
        });
      }
    };
    load();
  }, [user]);

  const getRuleBasedResponse = (text, ctx) => {
    const t = text.toLowerCase();

    // Cycle phase aware responses
    const phaseMsg = ctx
      ? `By the way, you're currently on day ${ctx.cycleDay} of your cycle in your ${ctx.phase} phase.`
      : "";

    if (t.includes("cramp") || t.includes("pain")) {
      return `For cramps, try a heating pad on your lower abdomen — it's one of the most effective remedies. Ibuprofen or naproxen taken at the first sign of cramps works better than waiting. Light movement like walking or yoga can also help. Magnesium supplements taken daily through your cycle may reduce cramping over time. ${phaseMsg}`;
    }
    if (t.includes("eat") || t.includes("food") || t.includes("diet") || t.includes("nutrition")) {
      if (ctx?.phase === "period") {
        return `During your period, focus on iron-rich foods like spinach, lentils, and red meat to replenish what you lose. Dark chocolate and magnesium-rich foods like nuts and seeds help ease cramps. Avoid excess salt and caffeine which can worsen bloating. Warm ginger tea is great for comfort and reducing inflammation. 🍵`;
      }
      if (ctx?.phase === "follicular") {
        return `In your follicular phase, your estrogen is rising so your metabolism is more efficient. Focus on lean proteins, fermented foods like yogurt and kimchi, and plenty of vegetables. This is a great time for lighter, energising meals. Your body is building up to ovulation so nutrient-dense foods help. 🥗`;
      }
      if (ctx?.phase === "ovulation") {
        return `During ovulation, focus on anti-inflammatory foods — berries, leafy greens, and omega-3 rich foods like salmon and flaxseeds. Zinc-rich foods like pumpkin seeds support healthy ovulation. Stay well hydrated as your body temperature is slightly higher now. ✨`;
      }
      if (ctx?.phase === "luteal") {
        return `In your luteal phase, cravings are completely normal — your body needs more calories right now. Focus on complex carbs like sweet potato and oats to stabilise mood, magnesium-rich foods to ease PMS, and reduce caffeine and alcohol which worsen symptoms. Dark chocolate is actually a good choice here! 🍫`;
      }
      return `Eating well through your cycle makes a big difference. During your period focus on iron and magnesium, in your follicular phase eat light and energising foods, around ovulation go anti-inflammatory, and in your luteal phase focus on complex carbs and magnesium to ease PMS. ${phaseMsg}`;
    }
    if (t.includes("tired") || t.includes("fatigue") || t.includes("energy") || t.includes("exhausted")) {
      return `Fatigue is one of the most common cycle symptoms. ${ctx?.phase === "period" ? "During your period, your body is working hard shedding the uterine lining — rest is essential, not a luxury." : ctx?.phase === "luteal" ? "In the luteal phase, progesterone has a sedative effect which causes tiredness. This is completely normal." : "Low energy can happen at any phase."} Try prioritising sleep, eating iron-rich foods, staying hydrated, and reducing caffeine which causes energy crashes. Light exercise like a short walk can actually boost energy more than resting. ${phaseMsg}`;
    }
    if (t.includes("pms") || t.includes("mood") || t.includes("irritable") || t.includes("emotional") || t.includes("anxious")) {
      return `PMS mood symptoms are caused by the drop in estrogen and progesterone before your period. ${ctx ? `Your current PMS risk is ${ctx.pmsRisk}%.` : ""} Things that genuinely help: magnesium supplementation (400mg daily), regular exercise, reducing sugar and caffeine, getting enough sleep, and tracking your triggers. Some people find evening primrose oil helpful. If symptoms severely impact your life, speak to a doctor about PMDD. ${phaseMsg}`;
    }
    if (t.includes("bloat") || t.includes("bloating")) {
      return `Bloating is super common, especially in the days before your period when progesterone causes water retention. Reduce salt intake, avoid carbonated drinks, eat smaller meals, and try peppermint tea or ginger tea. Light movement helps move gas through your system. Magnesium can help reduce water retention over time. ${phaseMsg}`;
    }
    if (t.includes("headache") || t.includes("migraine")) {
      return `Hormonal headaches are usually triggered by the drop in estrogen just before your period. Stay well hydrated, maintain consistent sleep, and avoid skipping meals. If they're severe, ibuprofen or aspirin taken early helps most. Some people find magnesium supplementation reduces hormonal migraines significantly over time. If migraines are debilitating, speak to a doctor — there are specific treatments. ${phaseMsg}`;
    }
    if (t.includes("sleep") || t.includes("insomnia")) {
      return `Sleep is strongly affected by your cycle. ${ctx?.phase === "luteal" ? "In your luteal phase, progesterone initially helps sleep but the drop before your period can cause insomnia." : ctx?.phase === "period" ? "During your period, cramps and discomfort can disrupt sleep — a heating pad and ibuprofen before bed help." : ""} Try keeping a consistent sleep schedule, avoiding screens an hour before bed, and keeping your room cool. Magnesium glycinate taken before bed is one of the most effective natural sleep aids. ${phaseMsg}`;
    }
    if (t.includes("exercise") || t.includes("workout") || t.includes("gym")) {
      if (ctx?.phase === "period") return `During your period, gentle movement is actually better than rest for most people — it releases endorphins that reduce cramps and improve mood. Try walking, light yoga, or swimming. Skip high intensity if you're feeling low energy, there's no shame in a rest day either. 🧘`;
      if (ctx?.phase === "follicular") return `Your follicular phase is the best time for high intensity workouts! Rising estrogen boosts strength, endurance, and recovery. This is when you'll feel your strongest — great time for new fitness goals, heavy lifting, or trying something new. 💪`;
      if (ctx?.phase === "ovulation") return `Around ovulation you have peak energy and strength. You'll likely feel your most athletic right now. Great time for competitive sports, HIIT, or challenging yourself. Just be aware that ligament laxity increases slightly around ovulation so warm up well. ✨`;
      if (ctx?.phase === "luteal") return `In your luteal phase, energy gradually decreases. Shift toward moderate intensity — pilates, hiking, cycling, or yoga. Listen to your body and don't push through exhaustion. Exercise still really helps with PMS symptoms, especially mood and bloating. 🌙`;
      return `Exercise affects and is affected by your cycle. You tend to be strongest in the follicular and ovulation phases, and benefit most from gentle movement in the luteal phase and during your period. Tuning workouts to your cycle can significantly improve both performance and recovery. ${phaseMsg}`;
    }
    if (t.includes("ovulat") || t.includes("fertile") || t.includes("fertility")) {
      return `${ctx?.phase === "ovulation" ? "You're currently in your ovulation window — this is your most fertile time!" : `Your ovulation typically occurs around day ${Math.round((ctx?.cycleLength || 28) * 0.5)} of your cycle.`} Signs of ovulation include clear stretchy discharge, a slight rise in basal body temperature, and sometimes mild one-sided cramping called mittelschmerz. Your fertile window is roughly 5 days before ovulation through the day of ovulation. ${phaseMsg}`;
    }
    if (t.includes("irregular") || t.includes("late") || t.includes("missed") || t.includes("skip")) {
      return `Irregular cycles are common and can be caused by stress, significant weight changes, thyroid issues, PCOS, or just natural variation. Cycles anywhere from 21 to 35 days are considered normal. If your periods have become significantly irregular, very heavy, or you've missed more than 3 in a row, it's worth speaking to a doctor to rule out underlying causes.`;
    }
    if (t.includes("acne") || t.includes("skin") || t.includes("breakout")) {
      return `Hormonal acne typically flares up in the week before your period when androgen levels rise. ${ctx?.phase === "luteal" ? "You're in your luteal phase right now which is when most hormonal breakouts occur." : ""} Keeping your skincare routine consistent, avoiding touching your face, and reducing dairy and high-glycemic foods can help. Salicylic acid and niacinamide are great skincare ingredients for hormonal acne. If it's severe, a dermatologist can discuss options like topical retinoids or hormonal treatments.`;
    }
    if (t.includes("stress") || t.includes("overwhelm") || t.includes("burnout")) {
      return `Stress and your cycle have a two-way relationship — stress disrupts your cycle, and your cycle affects how you handle stress. ${ctx?.phase === "luteal" ? `You're in your luteal phase where stress sensitivity is highest — your PMS risk is currently ${ctx.pmsRisk}%.` : ""} Prioritise rest, set boundaries, try breathwork or meditation, and remember that your capacity genuinely varies through your cycle. Be kind to yourself. 🌸`;
    }
    if (t.includes("phase") || t.includes("what phase") || t.includes("which phase")) {
      if (ctx) {
        const info = getPhaseInfo(ctx.phase);
        return `You're currently in your ${info.label} phase (day ${ctx.cycleDay} of ${ctx.cycleLength}). ${info.tip} Your next period is expected around ${ctx.nextPeriod}.`;
      }
      return `Your cycle has four phases: Menstrual (days 1–5), Follicular (days 6–12), Ovulation (days 13–15), and Luteal (days 16–28). Each phase has different hormone levels that affect your energy, mood, metabolism, and more. Log your period date to see which phase you're in!`;
    }
    if (t.includes("next period") || t.includes("when") || t.includes("predict")) {
      if (ctx) {
        return `Based on your cycle data, your next period is expected around ${ctx.nextPeriod}. You're currently on day ${ctx.cycleDay} of your ${ctx.cycleLength}-day cycle. Remember predictions improve the more cycles you log!`;
      }
      return `Log your last period date in the app to get a prediction for your next period. The more cycles you log, the more accurate the predictions become!`;
    }
    if (t.includes("hello") || t.includes("hi") || t.includes("hey")) {
      return `Hey there! 🌸 ${ctx ? `I can see you're on day ${ctx.cycleDay} of your cycle in your ${ctx.phase} phase.` : "Log your cycle data to get personalised insights!"} What can I help you with today? You can ask me about symptoms, nutrition, exercise, phases, or anything cycle-related!`;
    }

    // Default response
    return `That's a great question! ${ctx ? `Given that you're in your ${ctx.phase} phase (day ${ctx.cycleDay}), ` : ""}cycle health is really personal and varies for everyone. I'd recommend tracking your symptoms over a few cycles to spot your own patterns. In the meantime, the pillars of good cycle health are: consistent sleep, magnesium-rich foods, regular gentle movement, and stress management. Is there something more specific I can help with? 🌸`;
  };

  const sendMsg = (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", text };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate thinking delay
    setTimeout(() => {
      const reply = getRuleBasedResponse(text, cycleContext);
      setMessages(m => [...m, { role: "assistant", text: reply }]);
      setLoading(false);
    }, 800);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", background: C.bur5 }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: `0.5px solid rgba(125,31,46,0.1)`, padding: "14px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🌸</div>
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 600, color: C.txt }}>Cycle Assistant</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf50", animation: "pulse-dot 2s infinite" }} />
              <span style={{ fontSize: 11, color: C.txt3 }}>
                {cycleContext ? `Day ${cycleContext.cycleDay} · ${cycleContext.phase}` : "Online · Cycle Assistant"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {messages.map((m, i) => (
          <div key={i} className="fade-in" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {m.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginRight: 8, flexShrink: 0, marginTop: 2 }}>🌸</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "10px 14px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
              background: m.role === "user" ? C.bur : "#fff",
              color: m.role === "user" ? C.bur5 : C.txt,
              fontSize: 13, lineHeight: 1.6,
              border: m.role === "user" ? "none" : `0.5px solid rgba(125,31,46,0.1)`,
              whiteSpace: "pre-wrap",
            }}>{m.text}</div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🌸</div>
            <div style={{ background: "#fff", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", display: "flex", gap: 5, border: `0.5px solid rgba(125,31,46,0.1)` }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.bur4, animation: `pulse-dot 1.2s infinite ${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div style={{ padding: "0 16px 10px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => sendMsg(s)} style={{
              background: "#fff", border: `1px solid ${C.bur4}`, borderRadius: 16,
              padding: "7px 14px", fontSize: 11.5, color: C.bur, cursor: "pointer", whiteSpace: "nowrap"
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ background: "#fff", borderTop: `0.5px solid rgba(125,31,46,0.1)`, padding: "12px 16px 70px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(input); } }}
            placeholder="Ask anything about your cycle..."
            rows={1}
            style={{ flex: 1, resize: "none", background: C.bur5, border: `1.5px solid ${C.bur6}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", color: C.txt, maxHeight: 80 }}
          />
          <button
            onClick={() => sendMsg(input)}
            disabled={loading || !input.trim()}
            style={{ width: 38, height: 38, borderRadius: "50%", background: input.trim() && !loading ? C.bur : C.bur4, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
            {Icon.send()}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  REMINDERS PAGE  ░░░
───────────────────────────────────────────── */
function RemindersPage() {
  const [reminders, setReminders] = useState({
    periodAlert: true, periodDays: 3,
    ovulationAlert: true,
    pmsAlert: false,
    logReminder: true, logTime: "20:00"
  });

  const toggle = (key) => setReminders(r => ({ ...r, [key]: !r[key] }));

  return (
    <div className="fade-in" style={{ padding: "24px 16px 100px" }}>
      <h1 className="serif" style={{ fontSize: 26, color: C.txt, marginBottom: 6, letterSpacing: "-0.5px" }}>Reminders</h1>
      <p style={{ fontSize: 12, color: C.txt3, marginBottom: 24 }}>Never be caught off guard</p>

      {[
        {
          section: "Period Alerts",
          items: [{ key: "periodAlert", label: "Period approaching", desc: `Alert me ${reminders.periodDays} days before predicted period`, hasToggle: true }]
        },
        {
          section: "Cycle Alerts",
          items: [
            { key: "ovulationAlert", label: "Ovulation window", desc: "Notify when fertile window starts", hasToggle: true },
            { key: "pmsAlert", label: "PMS window", desc: "Alert 2 days before PMS phase begins", hasToggle: true },
          ]
        },
        {
          section: "Daily Logging",
          items: [{ key: "logReminder", label: "Daily log reminder", desc: `Remind me to log at ${reminders.logTime}`, hasToggle: true }]
        }
      ].map(section => (
        <div key={section.section}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: C.txt3, textTransform: "uppercase", letterSpacing: "0.8px", margin: "16px 0 8px" }}>{section.section}</h3>
          <div className="card">
            {section.items.map((item, i) => (
              <div key={item.key} style={{ padding: "14px 16px", borderBottom: i < section.items.length - 1 ? `0.5px solid ${C.bur6}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 500, color: C.txt, marginBottom: 2 }}>{item.label}</p>
                  <p style={{ fontSize: 11.5, color: C.txt3 }}>{item.desc}</p>
                </div>
                {item.hasToggle && (
                  <button onClick={() => toggle(item.key)} style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: reminders[item.key] ? C.bur : C.bur6, position: "relative", flexShrink: 0, transition: "background 0.2s"
                  }}>
                    <div style={{ position: "absolute", top: 2, left: reminders[item.key] ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card" style={{ padding: "14px 16px", marginTop: 8 }}>
        <p style={{ fontSize: 13.5, fontWeight: 500, color: C.txt, marginBottom: 6 }}>Alert me this many days before</p>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 5, 7].map(n => (
            <button key={n} onClick={() => setReminders(r => ({ ...r, periodDays: n }))} style={{
              width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${reminders.periodDays === n ? C.bur : C.bur6}`,
              background: reminders.periodDays === n ? C.bur5 : "#fff", color: reminders.periodDays === n ? C.bur : C.txt2,
              fontSize: 13, fontWeight: reminders.periodDays === n ? 700 : 400, cursor: "pointer"
            }}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{ background: C.bur6, borderRadius: 12, padding: "12px 14px", marginTop: 16, display: "flex", gap: 8 }}>
        <span>📱</span>
        <p style={{ fontSize: 12, color: C.txt2, lineHeight: 1.5 }}>Push notifications require installing TrackHER as a PWA. Tap "Add to Home Screen" in your browser.</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  PROFILE PAGE  ░░░
───────────────────────────────────────────── */
function ProfilePage({ onLogout, user }) {

  return (
    <div className="fade-in" style={{ padding: "24px 16px 100px" }}>
      <h1 className="serif" style={{ fontSize: 26, color: C.txt, marginBottom: 20, letterSpacing: "-0.5px" }}>Profile</h1>

      <div className="card" style={{ padding: "24px 20px", marginBottom: 16, textAlign: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 28, color: "#fff" }}>
          {(user?.displayName || user?.email || "?")[0].toUpperCase()}
        </div>
        <h2 className="serif" style={{ fontSize: 22, color: C.txt, marginBottom: 3 }}>
          {user?.displayName || user?.email?.split("@")[0] || "User"}
        </h2>
        <p style={{ fontSize: 13, color: C.txt3 }}>{user?.email || ""}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
          <span style={{ background: C.bur5, color: C.bur, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{mockUser.cycleLength} day cycle</span>
          <span style={{ background: C.bur5, color: C.bur, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{mockUser.periodDuration} day period</span>  
        </div>
      </div>

      <h3 style={{ fontSize: 11, fontWeight: 600, color: C.txt3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>CYCLE SETTINGS</h3>
      <div className="card" style={{ padding: "0 16px", marginBottom: 16 }}>
        {[
          { label: "Average cycle length", value: `${mockUser.cycleLength} days` },
          { label: "Typical period duration", value: `${mockUser.periodDuration} days` },
          { label: "Birth control", value: "None" },
          { label: "Trying to conceive", value: "No" },
        ].map((item, i, arr) => (
          <div key={item.label} style={{ padding: "13px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${C.bur6}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: C.txt2 }}>{item.label}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.bur }}>{item.value}</span>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 11, fontWeight: 600, color: C.txt3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>YOUR STATS</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[["3", "Cycles logged"], ["47", "Days tracked"], ["4.2/5", "Avg mood"], ["6.8h", "Avg sleep"]].map(([v, l]) => (
          <div key={l} className="card" style={{ padding: "14px 14px" }}>
            <div className="serif" style={{ fontSize: 22, color: C.bur, marginBottom: 2 }}>{v}</div>
            <div style={{ fontSize: 11, color: C.txt3 }}>{l}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 11, fontWeight: 600, color: C.txt3, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>ACCOUNT</h3>
      <div className="card" style={{ padding: "0 16px", marginBottom: 16 }}>
        {[
          { label: "Export my data"},
          { label: "Privacy & data"},
          { label: "Notifications"},
          { label: "Help & support"},
        ].map((item, i, arr) => (
          <div key={item.label} style={{ padding: "13px 0", borderBottom: i < arr.length - 1 ? `0.5px solid ${C.bur6}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span>{item.icon}</span>
              <span style={{ fontSize: 13, color: C.txt2 }}>{item.label}</span>
            </div>
            <span style={{ color: C.txt3, fontSize: 12 }}>›</span>
          </div>
        ))}
      </div>

      <button onClick={onLogout} className="btn-secondary" style={{ width: "100%", textAlign: "center", padding: "13px", fontSize: 13, color: C.bur }}>
        Sign out
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  APP SHELL  ░░░
───────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: "dashboard", label: "Home" },
  { key: "calendar", label: "Calendar" },
  { key: "trends", label: "Trends" },
  { key: "insights", label: "Insights" },
  { key: "chat", label: "Chat" },
  { key: "profile", label: "Profile" },
];

function AppShell({ children, activePage, setPage, user, showLog, setShowLog }) {
  
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bur5 }}>
      {/* DESKTOP SIDEBAR */}
      <aside style={{ width: 220, background: "#fff", borderRight: `0.5px solid rgba(125,31,46,0.1)`, display: "flex", flexDirection: "column", padding: "0 0 16px", flexShrink: 0 }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `0.5px solid rgba(125,31,46,0.07)` }}>
          <span className="serif" style={{ fontSize: 22, color: C.bur, letterSpacing: "-0.5px" }}>TrackHER</span>
        </div>

        <div style={{ padding: "14px 16px", borderBottom: `0.5px solid rgba(125,31,46,0.07)`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${C.bur}, ${C.bur2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {(user?.displayName || user?.email || "?")[0].toUpperCase()}
            </div>
            <div style={{ overflow: "hidden" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: C.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.displayName || user?.email?.split("@")[0] || "User"}
                </p>
                <p style={{ fontSize: 10, color: C.txt3 }}>Day 14 · Ovulation</p>
            </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          <p style={{ fontSize: 9, fontWeight: 600, color: C.txt3, textTransform: "uppercase", letterSpacing: "0.8px", padding: "0 8px", marginBottom: 6 }}>Overview</p>
          {NAV_ITEMS.slice(0, 5).map(item => {
            const active = activePage === item.key;
            return (
              <button key={item.key} onClick={() => setPage(item.key)} style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px",
                borderRadius: 9, marginBottom: 1, border: "none", cursor: "pointer", textAlign: "left",
                background: active ? C.bur5 : "transparent", color: active ? C.bur : C.txt2,
                fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', sans-serif",
                transition: "background 0.15s",
              }}>
                {Icon[item.key === "dashboard" ? "home" : item.key === "chat" ? "chat" : item.key === "insights" ? "insights" : item.key === "trends" ? "trends" : "calendar"](active)}
                {item.label}
                {active && <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: C.bur }} />}
              </button>
            );
          })}

          <p style={{ fontSize: 9, fontWeight: 600, color: C.txt3, textTransform: "uppercase", letterSpacing: "0.8px", padding: "0 8px", margin: "14px 0 6px" }}>Account</p>
          {[{ key: "reminders", label: "Reminders" }, { key: "profile", label: "Profile" }].map(item => {
            const active = activePage === item.key;
            return (
              <button key={item.key} onClick={() => setPage(item.key)} style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px",
                borderRadius: 9, marginBottom: 1, border: "none", cursor: "pointer", textAlign: "left",
                background: active ? C.bur5 : "transparent", color: active ? C.bur : C.txt2,
                fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', sans-serif",
              }}>
                {item.key === "reminders" ? Icon.bell() : Icon.profile(active)}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "0 12px 4px" }}>
          <button className="btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 13, padding: "10px" }}
            onClick={() => setShowLog(true)}>
            {Icon.add()} Log today
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ background: C.bur, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="serif" style={{ color: C.bur5, fontSize: 18 }}>TrackHER</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setPage("reminders")} style={{ background: "none", border: "none", cursor: "pointer", color: C.bur5 }}>
              {Icon.bell()}
            </button>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.bur4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: C.bur, cursor: "pointer" }}
            onClick={() => setPage("profile")}>
              {(user?.displayName || user?.email || "?")[0].toUpperCase()}
              </div>
          </div>
        </div>

        {children}

        {/* MOBILE BOTTOM NAV */}
        <div style={{ position: "fixed", bottom: 0, left: 220, right: 0, background: "#fff", borderTop: `0.5px solid rgba(125,31,46,0.1)`, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 0 12px", zIndex: 100 }}>
          {NAV_ITEMS.filter(n => ["dashboard", "calendar", "trends", "chat", "profile"].includes(n.key)).map(item => {
            const active = activePage === item.key;
            return (
              <button key={item.key} onClick={() => setPage(item.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                {Icon[item.key === "dashboard" ? "home" : item.key === "chat" ? "chat" : item.key === "insights" ? "insights" : item.key === "trends" ? "trends" : "profile"](active)}
                <span style={{ fontSize: 9, color: active ? C.bur : C.txt3, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                {active && <div style={{ width: 3, height: 3, borderRadius: "50%", background: C.bur }} />}
              </button>
            );
          })}
        </div>
      </main>

      {showLog && <LogModal onClose={() => setShowLog(false)} uid={user?.uid} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ░░░  ROOT APP  ░░░
───────────────────────────────────────────── */
export default function App() {
  const { user } = useAuth();
  const [screen, setScreen] = useState("landing");
  const [page, setPage] = useState("dashboard");
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (user) {
      setScreen("app");
    } else if (user === null) {
      if (screen === "app") setScreen("landing");
    }
  }, [user]);

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", background: C.bur5, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <span className="serif" style={{ fontSize: 28, color: C.bur }}>TrackHER</span>
          <p style={{ fontSize: 13, color: C.txt3, marginTop: 8 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (screen === "landing") return <LandingPage onGetStarted={() => setScreen("register")} onLogin={() => setScreen("login")} />;
  if (screen === "login") return <AuthPage mode="login" onSwitch={() => setScreen("register")} onSuccess={() => setScreen("app")} onBack={() => setScreen("landing")} />;
  if (screen === "register") return <AuthPage mode="register" onSwitch={() => setScreen("login")} onSuccess={() => setScreen("app")} onBack={() => setScreen("landing")} />;

  const renderPage = () => {
    switch (page) {
      case "dashboard":  return <Dashboard onLogOpen={() => setShowLog(true)} user={user} />;
      case "calendar":   return <CalendarPage />;
      case "trends":     return <TrendsPage />;
      case "insights":   return <InsightsPage />;
      case "chat":       return <ChatbotPage />;
      case "reminders":  return <RemindersPage />;
      case "profile":    return <ProfilePage onLogout={async () => { await logOut(); setPage("dashboard"); }} user={user} />;
      default:           return <Dashboard onLogOpen={() => setShowLog(true)} user={user} />;
    }
  };

  return (
    <AppShell activePage={page} setPage={setPage} user={user} showLog={showLog} setShowLog={setShowLog}>
      {renderPage()}
    </AppShell>
  );  
}