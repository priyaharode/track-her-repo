import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TrackHer from './trackher.jsx';
import { AuthProvider } from './AuthContext.jsx';
import './index.css';

// Inject global styles immediately before anything renders
const injectGlobalStyles = () => {
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
};

injectGlobalStyles();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TrackHer />
    </AuthProvider>
  </StrictMode>
);