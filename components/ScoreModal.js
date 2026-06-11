'use client';
import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import Select from './Select';
import { showToast } from './Toast';

export default function ScoreModal({ open, onClose, match, onSaved }) {
  const [hg, setHg] = useState('');
  const [ag, setAg] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (match) {
      setHg(match.home_goals ?? 0);
      setAg(match.away_goals ?? 0);
      setPw(match.penalty_winner_id || '');
    }
  }, [match]);

  const isScored = match && !(match.home_goals === 0 && match.away_goals === 0);
  const isTied = hg !== '' && ag !== '' && +hg === +ag;

  async function save() {
    const a = +hg, b = +ag;
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return;
    setLoading(true);
    try {
      const body = { home_goals: a, away_goals: b };
      if (pw && isTied) body.penalty_winner_id = +pw;
      const r = await fetch(`/api/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      onClose();
      onSaved();
      showToast('Score saved!');
    } catch (e) { showToast('Error: ' + e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-title">{isScored ? 'Edit Score' : 'Score Match'}</div>
      <div className="modal-teams">{match?.home_player} vs {match?.away_player}</div>
      <div className="modal-inputs">
        <input type="number" min="0" value={hg} onChange={e => setHg(e.target.value)} maxLength={2} />
        <span className="vs-dash">—</span>
        <input type="number" min="0" value={ag} onChange={e => setAg(e.target.value)} maxLength={2} />
      </div>
      {isTied && (
        <div className="mb-2 text-center">
          <div className="flex-center gap-2" style={{marginBottom:10}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aac4ff" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span className="text-sm" style={{color:'#aac4ff',fontWeight:600}}>Match is a draw</span>
          </div>
          <Select value={pw} onChange={v => setPw(v)} options={[
            {value:'', label:'— No penalty — regular draw'},
            ...(match?.home_player_id ? [{value:''+match.home_player_id, label:match.home_player + ' (wins on pens)'}] : []),
            ...(match?.away_player_id ? [{value:''+match.away_player_id, label:match.away_player + ' (wins on pens)'}] : [])
          ]} placeholder="Penalty winner" className="w-full" />
        </div>
      )}
      <div className="modal-actions">
        <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </Modal>
  );
}
