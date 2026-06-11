'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Select from '@/components/Select';
import { showToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/Modal';

const statusLabel = { draft:'Draft', ready:'Ready', started:'Started', ongoing:'Ongoing', completed:'Completed' };

function SkeletonGrid() {
  return (
    <div className="league-list">
      {[1,2,3].map(i => (
        <div key={i} className="skel skel-card" style={{animationDelay: i * 0.08 + 's'}} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState('round-robin');
  const [legs, setLegs] = useState(1);
  const [legsCustom, setLegsCustom] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => { setLeagues(d); setLoading(false); });
  }, []);

  async function create() {
    if (!name.trim()) { showToast('Please enter a league name'); return; }
    const legsVal = legs === 0 ? Math.max(1, parseInt(legsCustom) || 1) : legs;
    try {
      const r = await fetch('/api/leagues', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name, type, legs: legsVal}) });
      if (!r.ok) throw new Error((await r.json()).error);
      setName('');
      setLeagues(await fetch('/api/leagues').then(r => r.json()));
      showToast('League created');
    } catch(e) { showToast('Error: ' + e.message); }
  }

  async function delLeague(id) {
    await fetch('/api/leagues/' + id, { method:'DELETE' });
    setLeagues(await fetch('/api/leagues').then(r => r.json()));
    showToast('Deleted');
  }

  return (
    <>
      <Nav />
      <main className="page-enter">
        <div className="hero-area animate-in delay-1">
          <div className="hero-glow" />
          <div className="hero-img-frame">
            <img src="/hero.jpg" alt="PPL" className="hero-img" loading="lazy" onError={e => { e.target.style.display='none' }} />
          </div>
          <h1 className="hero-title">Perumbavoor Premier League</h1>
          <p className="hero-sub">Football management, reimagined.</p>
          <div className="hero-divider" />
        </div>

        <div className="create-card animate-in delay-2">
          <div className="create-card-header">
            <div className="create-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <h3>Create New League</h3>
          </div>
          <div className="create-card-form">
            <input type="text" placeholder="Enter league name" value={name} onChange={e => setName(e.target.value)} />
            <Select value={type} onChange={v => setType(v)} options={[{value:'round-robin',label:'League (Round Robin)'},{value:'knockout',label:'Knockout Cup'}]} placeholder="Format" />
            <Select value={legs} onChange={v => setLegs(+v)} options={[{value:1,label:'1 leg'},{value:2,label:'2 legs'},{value:0,label:'Custom'}]} placeholder="Legs" className="min-w-80" />
            {legs === 0 && (
              <input type="number" min="1" max="99" placeholder="Games" value={legsCustom} onChange={e => setLegsCustom(e.target.value)} className="w-70" />
            )}
            <button className="btn-primary" onClick={create}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create League
            </button>
          </div>
        </div>

        <div className="section-card animate-in delay-3">
          <div className="section-head">
            <h2>Your Leagues</h2>
            <span className="section-count">{loading ? <span className="skel skel-badge" /> : leagues.length + ' league' + (leagues.length !== 1 ? 's' : '')}</span>
          </div>

        {loading ? (
          <SkeletonGrid />
        ) : !leagues.length ? (
          <div className="empty-state">
            <svg className="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p>No leagues yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="league-list stagger-children">
            {leagues.map(l => (
              <Link key={l.id} href={'/leagues/' + l.id} className="league-card no-deco">
                <div className="lc-top">
                  <div className="lc-type">{l.type === 'knockout' ? 'Cup' : 'League'} {(l.legs || 1) > 1 ? (l.legs + ' legs') : ''}</div>
                  <button className="lc-del" onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirm({id:l.id,name:l.name}); }} aria-label="Delete league">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
                <div className="lc-icon fs-28">{l.type === 'knockout' ? '\u{1F3C6}' : '\u26BD'}</div>
                <h3 className="lc-name">{l.name}</h3>
                <div className="lc-stats">
                  <span><strong>{l.player_count || 0}</strong> player{(l.player_count||0) !== 1 ? 's' : ''}</span>
                  <span className="lc-dot">&bull;</span>
                  <span><strong>{l.match_count || 0}</strong> match{(l.match_count||0) !== 1 ? 'es' : ''}</span>
                </div>
                <div className={'lc-badge ' + (l.status || 'draft')}>{statusLabel[l.status] || 'Draft'}</div>
              </Link>
            ))}
          </div>
        )}
        </div>
      </main>
      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => { delLeague(confirm.id); setConfirm(null); }} title="Delete League?" message={'Are you sure you want to delete "' + (confirm?.name || '') + '"? This cannot be undone.'} />
    </>
  );
}
