import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TrackHer from './trackher.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TrackHer /> {/* Render it directly */}
  </StrictMode>
);