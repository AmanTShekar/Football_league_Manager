'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { showToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import ScoreModal from '@/components/ScoreModal';
import ChampionCelebration from '@/components/ChampionCelebration';

const statusLabel = { draft:'Draft', ready:'Ready', started:'Started', ongoing:'Ongoing', completed:'Completed' };
const tabs = ['standings','players','matches'];
const tabLabels = { standings:'Table', players:'Players', matches:'Matches' };

function detectChampion(matches, rrMatches) {
  if (!matches?.length) return null;
  const maxRound = Math.max(...matches.map(m => m.round));
  if (maxRound > 1) {
    const finals = matches.filter(m => m.round === maxRound);
    const final = finals.find(m => !(m.home_goals === 0 && m.away_goals === 0) || m.penalty_winner_id);
    if (!final || !final.home_player_id || !final.away_player_id) return null;
    if (final.penalty_winner_id) return final.penalty_winner_id;
    if (final.home_goals === final.away_goals) return null;
    return final.home_goals > final.away_goals ? final.home_player_id : final.away_player_id;
  }
  const allPlayed = rrMatches.length > 0 && rrMatches.every(m => !(m.home_goals === 0 && m.away_goals === 0));
  if (!allPlayed) return null;
  const stats = {};
  for (const m of rrMatches) {
    if (!stats[m.home_player_id]) stats[m.home_player_id] = { id: m.home_player_id, pts: 0, gd: 0, gf: 0 };
    if (!stats[m.away_player_id]) stats[m.away_player_id] = { id: m.away_player_id, pts: 0, gd: 0, gf: 0 };
    if (m.home_goals === 0 && m.away_goals === 0) continue;
    stats[m.home_player_id].gf += m.home_goals; stats[m.home_player_id].gd += m.home_goals - m.away_goals;
    stats[m.away_player_id].gf += m.away_goals; stats[m.away_player_id].gd += m.away_goals - m.home_goals;
    if (m.home_goals > m.away_goals) stats[m.home_player_id].pts += 3;
    else if (m.home_goals < m.away_goals) stats[m.away_player_id].pts += 3;
    else { stats[m.home_player_id].pts += 1; stats[m.away_player_id].pts += 1; }
  }
  const ranked = Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
  return ranked.length > 0 ? ranked[0].id : null;
}

function playerColor(id) {
  const colors = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#7b2cbf','#d62828','#003049','#606c38','#00b4d8','#b56576','#4a4e69','#0b525b','#f77f00','#1d3557'];
  return colors[Math.abs(id) % colors.length];
}

export default function LeaguePage() {
  const { id } = useParams();
  const [league, setLeague] = useState(null);
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('league_tab_' + id) || 'standings';
    return 'standings';
  });
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState(null);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [matchSec, setMatchSec] = useState('pending');
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [addMatchSel, setAddMatchSel] = useState({ home:'', away:'' });

  const [scoreMatch, setScoreMatch] = useState(null);

  const [championTeam, setChampionTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(0);
  const prevChampionRef = useRef(null);
  const loadedOnce = useRef(false);
  const needsAutoFill = useRef(false);

  const load = useCallback(async () => {
    const idNum = ++loadRef.current;
    if (!loadedOnce.current) setLoading(true);

    const data = await fetch('/api/leagues/' + id + '/page-data').then(r => r.json());
    if (loadRef.current !== idNum) return;
    setLeague(data.league); setParticipants(data.participants); setStandings(data.standings);
    let matchesData = data.matches;

    if (data.league?.type === 'league' && needsAutoFill.current) {
      needsAutoFill.current = false;
      const result = await autoFillPlayoffs();
      if (loadRef.current !== idNum) return;
      if (result.changes?.length) {
        matchesData = await fetch('/api/leagues/' + id + '/page-data').then(r => r.json()).then(d => d.matches);
        if (loadRef.current !== idNum) return;
      }
    }

    setMatches(matchesData);
    if (!loadedOnce.current) setLoading(false);
    loadedOnce.current = true;
    if (loadRef.current !== idNum) return;

    const rr = matchesData.filter(m => m.round === 1);
    const champ = detectChampion(matchesData, rr);
    if (champ && champ !== prevChampionRef.current) {
      prevChampionRef.current = champ;
      const cp = data.participants.find(p => p.id === champ);
      if (cp) setChampionTeam(cp);
    }
    if (!champ) prevChampionRef.current = null;
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'standings') {
      fetch('/api/leagues/' + id + '/standings').then(r => r.json()).then(setStandings);
    }
  }, [tab, id]);

  async function addExistingParticipant(playerId) {
    if (!playerId) { showToast('Select a player from the list'); return; }
    await fetch('/api/leagues/' + id + '/participants', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({player_id:playerId}) });
    await load();
  }

  async function addNewParticipant() {
    if (!newPlayerName.trim()) { showToast('Please enter a player name'); return; }
    try {
      const r = await fetch('/api/players', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:newPlayerName}) });
      if (!r.ok) throw new Error((await r.json()).error);
      const player = await r.json();
      await fetch('/api/leagues/' + id + '/participants', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({player_id:player.id}) });
      setNewPlayerName(''); await load();
    } catch(e) { showToast(e.message); }
  }

  async function removeParticipant(linkId) {
    await fetch('/api/participants/' + linkId, { method:'DELETE' });
    await load();
  }

  async function addMatchViaModal() {
    if (!addMatchSel.home || !addMatchSel.away) { showToast('Select both home and away players'); return; }
    await fetch('/api/leagues/' + id + '/matches', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({home_player_id:+addMatchSel.home, away_player_id:+addMatchSel.away, home_goals:0, away_goals:0}) });
    setAddMatchSel({ home:'', away:'' }); setShowAddMatch(false); await load();
  }

  async function genFixtures() {
    try {
      const r = await fetch('/api/leagues/' + id + '/generate-fixtures', { method:'POST' });
      if (!r.ok) throw new Error((await r.json()).error);
      await load();
    } catch(e) { showToast('Error: ' + e.message); }
  }

  async function genKnockout() {
    try {
      const r = await fetch('/api/leagues/' + id + '/generate-knockout', { method:'POST' });
      if (!r.ok) throw new Error((await r.json()).error);
      await load();
    } catch(e) { showToast('Error: ' + e.message); }
  }

  async function advanceKnockout() {
    try {
      const r = await fetch('/api/leagues/' + id + '/advance-knockout', { method:'POST' });
      if (!r.ok) throw new Error((await r.json()).error);
      await load();
    } catch(e) { showToast('Error: ' + e.message); }
  }

  async function autoFillPlayoffs() {
    try {
      const r = await fetch('/api/leagues/' + id + '/auto-fill-playoffs', { method:'POST' });
      return await r.json();
    } catch(e) { return { changes: [] }; }
  }

  function onScoreSaved() {
    prevChampionRef.current = null;
    needsAutoFill.current = true;
    load();
  }

  const rrMatches = useMemo(() => matches.filter(m => m.round === 1), [matches]);
  const pendingMatches = useMemo(() => matches.filter(m => m.home_goals === 0 && m.away_goals === 0), [matches]);
  const doneMatches = useMemo(() => matches.filter(m => m.home_goals !== 0 || m.away_goals !== 0), [matches]);
  const champPlayerId = useMemo(() => detectChampion(matches, rrMatches), [matches, rrMatches]);
  const qualifier = useMemo(() => matches.find(m => m.round === 2), [matches]);
  const finalMatch = useMemo(() => matches.find(m => m.round === 3), [matches]);

  if (loading && !league) return <><Nav /><main><div className="loading-screen"><div className="loading-spinner" /><div className="loading-text">Loading...</div></div></main></>;

  const isKo = league.type === 'knockout';
  const globalStatus = league.status || 'draft';
  const allRrPlayed = !loading && !isKo && rrMatches.length > 0 && rrMatches.every(m => !(m.home_goals === 0 && m.away_goals === 0));
  const qualifierReady = qualifier && qualifier.home_player_id && qualifier.away_player_id;
  const qualifierScored = qualifierReady && !(qualifier.home_goals === 0 && qualifier.away_goals === 0) && (qualifier.home_goals !== qualifier.away_goals || qualifier.penalty_winner_id);
  const finalReady = finalMatch && finalMatch.home_player_id && finalMatch.away_player_id;
  const rrMatchesExist = matches.some(m => m.round === 1);

  return (
    <>
      <Nav />
      <main>
        <div className="lp-header">
          <Link href="/" className="btn-ghost btn-sm" style={{alignSelf:'flex-start',textDecoration:'none'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </Link>
          <div className="lp-title-area">
            <h2 className="lp-title">{league.name}</h2>
            <div className="lp-meta">
              <span className={'type-badge ' + (isKo ? 'knockout' : 'league')}>{isKo ? 'Cup' : 'League'}{(league.legs || 1) > 1 ? ' ' + league.legs + ' legs' : ''}</span>
              <span className={'type-badge ' + globalStatus}>{statusLabel[globalStatus]}</span>
              {champPlayerId && <span className="type-badge completed">Champion: {(participants.find(p => p.id === champPlayerId)?.name || '')}</span>}
            </div>
          </div>
        </div>

        <div className="lv-tabs">
          {tabs.map(t => (
            <button key={t} className={'lv-tab' + (tab === t ? ' active' : '')} onClick={() => { setTab(t); sessionStorage.setItem('league_tab_' + id, t); }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {tab === 'standings' && (
          <div className="standings-scroll">
            {isKo ? (
              <table className="standings-table">
                <thead><tr><th className="stand-pos">#</th><th>Player</th><th className="stand-pts">Status</th></tr></thead>
                <tbody>
                  {!participants.length ? (
                    <tr><td colSpan="3" style={{textAlign:'center',color:'var(--text-3)',padding:24}}>No players yet</td></tr>
                  ) : participants.map((p,i) => {
                    const isChamp = champPlayerId === p.id;
                    return (
                      <tr key={p.id} className={isChamp ? 'champion-row' : ''}>
                        <td className="stand-pos">{i + 1}</td>
                        <td><div className="stand-team"><div className="stand-swatch" style={{background:playerColor(p.id)}} /><span className="stand-name">{p.name}</span></div></td>
                        <td className="stand-pts" style={{color:'var(--text-3)',fontSize:12}}>{isChamp ? 'CHAMPION' : 'Active'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <>
                <table className="standings-table">
                  <thead><tr><th className="stand-pos">#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th className="stand-pts">Pts</th></tr></thead>
                  <tbody>
                    {!standings?.standings?.length ? (
                      <tr><td colSpan="8" style={{textAlign:'center',color:'var(--text-3)',padding:24}}>No standings yet.</td></tr>
                    ) : standings.standings.map(row => (
                      <tr key={row.player_id} className={champPlayerId === row.player_id ? 'champion-row' : ''}>
                        <td className="stand-pos">{row.position}</td>
                        <td><div className="stand-team"><div className="stand-swatch" style={{background:row.color}} /><span className="stand-name">{row.name}</span></div></td>
                        <td>{row.mp}</td><td>{row.w}</td><td>{row.d}</td><td>{row.l}</td>
                        <td>{row.gd >= 0 ? '+' : ''}{row.gd}</td><td className="stand-pts">{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {champPlayerId && (
                  <div className="playoff-section">
                    <div className="playoff-banner">🏆 Champion: {(participants.find(p => p.id === champPlayerId)?.name || '')}</div>
                  </div>
                )}
                {!champPlayerId && qualifier && qualifier.home_player_id && qualifier.away_player_id && (
                  <div className="playoff-section">
                    <div className="playoff-round">
                      {qualifierScored && finalReady ? (
                        !(finalMatch.home_goals === 0 && finalMatch.away_goals === 0) && (finalMatch.home_goals !== finalMatch.away_goals || finalMatch.penalty_winner_id) ? '' :
                        <div className="playoff-mp">⚽ Final: Score to crown champion!</div>
                      ) : qualifierScored ? (
                        <div className="playoff-mp">⬆ Qualifier done — Final set!</div>
                      ) : (
                        <div className="playoff-mp">⚽ Qualifier: Score to advance</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'players' && (
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title">Players ({participants.length})</div>
            </div>
            <div className="action-bar">
              <AddPlayerDropdown leagueId={id} participants={participants} onAdd={addExistingParticipant} />
              <button className="btn-primary btn-sm" onClick={addNewParticipant} disabled={!newPlayerName.trim()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add New
              </button>
            </div>
            <div className="inline-form-row">
              <input type="text" placeholder="Create new player..." className="create-input" style={{flex:1,minWidth:120}} value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewParticipant()} />
            </div>
            {!participants.length ? (
              <p style={{textAlign:'center',color:'var(--text-3)',fontSize:13,padding:24}}>No players in this league.</p>
            ) : (
              <div className="players-grid">
                {participants.map(p => (
                  <div key={p.link_id || p.id} className="p-card" style={{borderColor: playerColor(p.id) + '30'}}>
                    <div className="p-avatar" style={{background:`linear-gradient(135deg, ${playerColor(p.id)}44, ${playerColor(p.id)}22)`, borderColor: playerColor(p.id)}}>{p.name.charAt(0).toUpperCase()}</div>
                    <div className="p-name">{p.name}</div>
                    <button className="p-del" onClick={() => removeParticipant(p.link_id)} aria-label="Remove player">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'matches' && (
          <div>
            <div className="action-bar right">
              {isKo ? (
                <>
                  <button className="btn-ghost btn-sm" onClick={genKnockout}>⚙ Generate Bracket</button>
                  <button className="btn-ghost btn-sm" onClick={advanceKnockout}>▶ Advance Round</button>
                </>
              ) : (
                <button className="btn-ghost btn-sm" onClick={genFixtures} disabled={rrMatchesExist}>
                  {rrMatchesExist ? 'Fixtures Generated' : '⚙ Generate Fixtures'}
                </button>
              )}
              <button className="btn-primary btn-sm" onClick={() => setShowAddMatch(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Match
              </button>
            </div>

            <div className="match-section-tabs">
              <button className={'match-sec-tab' + (matchSec === 'pending' ? ' active' : '')} onClick={() => setMatchSec('pending')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Upcoming
                <span className="match-sec-count">{pendingMatches.length}</span>
              </button>
              <button className={'match-sec-tab' + (matchSec === 'completed' ? ' active' : '')} onClick={() => setMatchSec('completed')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Completed
                <span className="match-sec-count">{doneMatches.length}</span>
              </button>
            </div>

            {matchSec === 'pending' && (
              <div>
                {!pendingMatches.length ? (
                  <p style={{fontSize:13,color:'var(--text-3)',padding:12,textAlign:'center'}}>No upcoming matches</p>
                ) : pendingMatches.map(m => {
                  const isSemi = m.round === 2 && !isKo;
                  const isFinal = m.round === 3 && !isKo;
                  const hasPlayers = m.home_player_id && m.away_player_id;
                  const isTbd = !hasPlayers;
                  const label = isSemi ? 'Qualifier' : isFinal ? 'Final' : m.round > 1 ? 'Round ' + m.round : '';
                  const homeName = m.home_player || 'TBD';
                  const awayName = m.away_player || 'TBD';
                  return (
                    <div key={m.id} className={'match-card' + (!isTbd ? ' clickable' : '') + (isSemi ? ' semi' : '') + (isFinal ? ' final' : '')} onClick={() => !isTbd && setScoreMatch(m)}>
                      <div className="match-card-team home">
                        {label && <span className="match-card-label">{label}</span>}
                        <div className="match-card-name">{homeName}</div>
                      </div>
                      <div className="match-vs-badge">{isTbd ? 'VS' : '—'}</div>
                      <div className="match-card-team away">
                        <div className="match-card-name">{awayName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {matchSec === 'completed' && (
              <div>
                {!doneMatches.length ? (
                  <p style={{fontSize:13,color:'var(--text-3)',padding:12,textAlign:'center'}}>No completed matches</p>
                ) : doneMatches.map(m => {
                  const isDraw = m.home_goals === m.away_goals && !m.penalty_winner_id;
                  return (
                    <div key={m.id} className="match-card clickable" onClick={() => setScoreMatch(m)}>
                      <div className="match-card-team home">
                        <div className="match-card-name">{m.home_player}</div>
                      </div>
                      <div className="match-card-score">{m.home_goals}—{m.away_goals}{m.penalty_winner_id ? <span className="pens-label">pens</span> : isDraw ? <span className="draw-label">draw</span> : ''}</div>
                      <div className="match-card-team away">
                        <div className="match-card-name">{m.away_player}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      <Modal open={showAddMatch} onClose={() => setShowAddMatch(false)}>
        <div className="modal-title">Add Match</div>
        <div className="modal-teams">Select players for the match</div>
        <div className="modal-inputs" style={{gap:12}}>
          <select className="create-select" value={addMatchSel.home} onChange={e => setAddMatchSel(s => ({...s,home:e.target.value}))} style={{flex:1}}>
            <option value="">Home player</option>
            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="vs-dash">—</span>
          <select className="create-select" value={addMatchSel.away} onChange={e => setAddMatchSel(s => ({...s,away:e.target.value}))} style={{flex:1}}>
            <option value="">Away player</option>
            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost btn-sm" onClick={() => setShowAddMatch(false)}>Cancel</button>
          <button className="btn-primary btn-sm" onClick={addMatchViaModal} disabled={!addMatchSel.home || !addMatchSel.away}>Add Match</button>
        </div>
      </Modal>

      <ScoreModal open={!!scoreMatch} onClose={() => setScoreMatch(null)} match={scoreMatch} onSaved={onScoreSaved} />
      <ChampionCelebration
        open={!!championTeam}
        onClose={() => setChampionTeam(null)}
        teamName={championTeam?.name}
        playerNames={[championTeam?.name].filter(Boolean)}
      />
    </>
  );
}

function AddPlayerDropdown({ leagueId, participants, onAdd }) {
  const [allPlayers, setAllPlayers] = useState([]);
  const [sel, setSel] = useState('');

  useEffect(() => {
    fetch('/api/players').then(r => r.json()).then(setAllPlayers);
  }, [leagueId]);

  const inLeague = new Set(participants.map(p => p.id));
  const available = allPlayers.filter(p => !inLeague.has(p.id));

  return (
    <>
      <select className="create-select" style={{flex:1,minWidth:140}} value={sel} onChange={e => setSel(e.target.value)}>
        <option value="">Add existing player...</option>
        {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button className="btn-primary btn-sm" onClick={() => { if (sel) { onAdd(+sel); setSel(''); } }}>Add</button>
    </>
  );
}


