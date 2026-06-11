'use client';
import { useState, useEffect } from 'react';
import { Modal } from './Modal';

function renderStars(n) {
  let s = '';
  for (let i = 0; i < 5; i++) s += '<svg class="hof-star' + (i < n ? '' : ' empty') + '" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  return s;
}

export default function ProfileModal({ open, onClose, playerId }) {
  const [profile, setProfile] = useState(null);
  const [wins, setWins] = useState([]);

  useEffect(() => {
    if (!open || !playerId) return;
    fetch(`/api/players/${playerId}/profile`).then(r => r.json()).then(setProfile);
    fetch(`/api/players/${playerId}/wins`).then(r => r.json()).then(setWins);
  }, [open, playerId]);

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="profile-modal text-left">
        <div className="profile-header">
          <div className="profile-avatar-lg">{profile?.name?.charAt(0) || '?'}</div>
          <div className="profile-info">
            <div className="profile-name-lg">{profile?.name || 'Loading...'}</div>
            <div className="profile-stars" dangerouslySetInnerHTML={{ __html: renderStars(profile?.total_wins || 0) }} />
            <div className="profile-league">{(profile?.total_wins || 0) + ' career win' + (profile?.total_wins !== 1 ? 's' : '')}</div>
          </div>
        </div>
        <div className="profile-section-title">Match History</div>
        <div className="profile-match-list">
          {!wins.length ? (
            <p className="empty-text" style={{padding:16}}>No match history yet.</p>
          ) : wins.map(w => (
            <div key={w.id} className="profile-match-item">
              <div className="profile-match-teams">{w.home_team} {w.home_goals} &mdash; {w.away_goals} {w.away_team}</div>
              <div className="profile-match-league">{w.league_name}</div>
            </div>
          ))}
        </div>
        <div className="modal-actions mt-3">
          <button className="btn-ghost btn-sm btn-block" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
