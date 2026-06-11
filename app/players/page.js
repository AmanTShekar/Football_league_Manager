'use client';
import { useState, useEffect } from 'react';
import Nav from '@/components/Nav';
import { showToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/Modal';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetch('/api/players').then(r => r.json()).then(setPlayers); }, []);

  async function add() {
    if (!name.trim()) { showToast('Please enter a player name'); return; }
    try {
      const r = await fetch('/api/players', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name}) });
      if (!r.ok) throw new Error((await r.json()).error);
      setName('');
      setPlayers(await fetch('/api/players').then(r => r.json()));
      showToast('Player added');
    } catch(e) { showToast('Error: ' + e.message); }
  }

  async function delPlayer(id) {
    await fetch('/api/players/' + id, { method:'DELETE' });
    setPlayers(await fetch('/api/players').then(r => r.json()));
    showToast('Deleted');
  }

  return (
    <>
      <Nav />
      <main>
        <div className="section-card">
          <div className="section-head">
            <h2>Players</h2>
            <span className="section-count">{players.length} player{players.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="inline-form-row" style={{marginBottom:16}}>
            <input type="text" placeholder="Player name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            <button className="btn-primary" onClick={add}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Player
            </button>
          </div>
          {!players.length ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={{opacity:0.3,marginBottom:12}}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
              <p>No players yet. Add global players above.</p>
            </div>
          ) : (
            <div className="players-grid">
              {players.map(p => (
                <div key={p.id} className="p-card">
                  <div className="p-avatar">{p.name.charAt(0).toUpperCase()}</div>
                  <div className="p-name">{p.name}</div>
                  <button className="p-del" onClick={() => setConfirm({id:p.id,name:p.name})} aria-label="Delete player">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => { delPlayer(confirm.id); setConfirm(null); }} title="Delete Player?" message={'Are you sure you want to delete "' + (confirm?.name || '') + '"? This cannot be undone.'} />
    </>
  );
}
