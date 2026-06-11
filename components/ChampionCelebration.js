'use client';
import { useEffect, useState } from 'react';

const symbols = ['✦','✧','★','⚡','●','♦','♛','♕','◆','▸'];

export default function ChampionCelebration({ open, onClose, teamName, playerNames }) {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(typeof window !== 'undefined' && window.innerWidth < 600);
  }, []);
  const particleCount = isMobile ? 20 : 50;
  useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
      const t = setTimeout(() => { setVisible(false); document.body.style.overflow = ''; onClose?.(); }, 6000);
      return () => { clearTimeout(t); document.body.style.overflow = ''; };
    }
  }, [open]);
  if (!open && !visible) return null;
  return (
    <div className={'celebration-overlay' + (visible ? ' active' : '')} onClick={() => { setVisible(false); document.body.style.overflow = ''; onClose?.(); }}>
      <div className="celebration-particles">
        {Array.from({length:particleCount},(_,i)=>i).map(i => (
          <div key={i} className="confetti-particle" style={{
            left: Math.random() * 100 + '%',
            animationDuration: (2 + Math.random() * 3) + 's',
            animationDelay: Math.random() * 2 + 's',
            fontSize: (10 + Math.random() * 20) + 'px',
            opacity: 0.5 + Math.random() * 0.5,
          }}>{symbols[i % symbols.length]}</div>
        ))}
      </div>
      <div className="celebration-glow" />
      <div className="celebration-content">
        <div className="celebration-crown">👑</div>
        <div className="celebration-label">CHAMPION</div>
        <div className="celebration-team">{teamName}</div>
        {playerNames?.length > 0 && <div className="celebration-players">{playerNames.join(' • ')}</div>}
        <div className="celebration-stars">
          {[0,1,2,3,4].map(i => (
            <svg key={i} className={'celebration-star' + (i === 0 ? ' pulse' : '')} style={{animationDelay: i * 0.12 + 's'}} viewBox="0 0 24 24" fill="#ffd60a">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          ))}
        </div>
        <div className="celebration-power">
          <span>⚡</span><span>P</span><span>⚡</span><span>O</span><span>⚡</span><span>W</span><span>⚡</span><span>E</span><span>⚡</span><span>R</span><span>⚡</span>
        </div>
      </div>
    </div>
  );
}
