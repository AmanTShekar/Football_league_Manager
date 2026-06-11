'use client';
import { useState, useEffect } from 'react';
import Nav from '@/components/Nav';
import ProfileModal from '@/components/ProfileModal';

function Stars({ n }) {
  const maxStars = 5;
  const overflow = Math.max(0, n - maxStars);
  const display = Math.min(n, maxStars);
  return (
    <div className="hof-stars">
      {Array.from({length:display},(_,i)=>i).map(i => (
        <svg key={i} className="hof-star" viewBox="0 0 24 24" fill="#ffd60a">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
      {overflow > 0 && <span className="hof-overflow">+{overflow}</span>}
    </div>
  );
}

export default function HofPage() {
  const [entries, setEntries] = useState([]);
  const [profileId, setProfileId] = useState(null);

  useEffect(() => { fetch('/api/hall-of-fame').then(r => r.json()).then(setEntries); }, []);

  return (
    <>
      <Nav />
      <main className="page-enter">
        <div className="section-card animate-in" style={{animationDelay:'0.1s'}}>
          <div className="section-head">
            <h2>Hall of Fame</h2>
            <span className="section-count">{entries.length} champion{entries.length !== 1 ? 's' : ''}</span>
          </div>
          {!entries.length ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={{opacity:0.3,marginBottom:12}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <p>No champions yet. Score matches to crown winners.</p>
            </div>
          ) : (
            <div className="hof-grid stagger-children">
              {entries.map(h => (
                <div key={h.player_id} className="hof-card" onClick={() => setProfileId(h.player_id)}>
                  <div className="hof-avatar">{h.player_name.charAt(0).toUpperCase()}</div>
                  <div className="hof-name">{h.player_name}</div>
                  <Stars n={h.wins} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <ProfileModal open={!!profileId} onClose={() => setProfileId(null)} playerId={profileId} />
    </>
  );
}
