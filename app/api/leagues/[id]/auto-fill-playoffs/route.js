import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function POST(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const league = await pool.query('SELECT type FROM leagues WHERE id = $1', [params.id]);
  if (!league.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (league.rows[0].type !== 'league') return NextResponse.json({ error: 'Only for round-robin' }, { status: 400 });

  const allMatches = (await pool.query('SELECT * FROM matches WHERE league_id = $1 ORDER BY round ASC, match_index ASC', [params.id])).rows;
  const rr = allMatches.filter(m => m.round === 1);
  const qualifier = allMatches.find(m => m.round === 2);
  const final = allMatches.find(m => m.round === 3);
  if (!qualifier || !final) return NextResponse.json({ error: 'Playoff bracket not found' }, { status: 400 });

  const players = (await pool.query(`
    SELECT p.id, p.name FROM league_participants lp JOIN players p ON lp.player_id = p.id WHERE lp.league_id = $1 ORDER BY p.name
  `, [params.id])).rows;

  const allRrPlayed = rr.length > 0 && rr.every(m => !(m.home_goals === 0 && m.away_goals === 0));
  const changes = [];

  if (allRrPlayed && (!qualifier.home_player_id || !qualifier.away_player_id)) {
    const stats = {};
    for (const p of players) stats[p.id] = { player_id: p.id, name: p.name, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    for (const m of rr) {
      if (!stats[m.home_player_id] || !stats[m.away_player_id]) continue;
      if (m.home_goals === 0 && m.away_goals === 0) continue;
      stats[m.home_player_id].mp++; stats[m.away_player_id].mp++;
      stats[m.home_player_id].gf += m.home_goals; stats[m.home_player_id].ga += m.away_goals;
      stats[m.away_player_id].gf += m.away_goals; stats[m.away_player_id].ga += m.home_goals;
      if (m.home_goals > m.away_goals) { stats[m.home_player_id].w++; stats[m.home_player_id].pts += 3; stats[m.away_player_id].l++; }
      else if (m.home_goals < m.away_goals) { stats[m.away_player_id].w++; stats[m.away_player_id].pts += 3; stats[m.home_player_id].l++; }
      else { stats[m.home_player_id].d++; stats[m.away_player_id].d++; stats[m.home_player_id].pts++; stats[m.away_player_id].pts++; }
    }
    for (const s of Object.values(stats)) s.gd = s.gf - s.ga;
    const ranked = Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    if (ranked.length >= 3) {
      await pool.query('UPDATE matches SET home_player_id = $1, away_player_id = $2 WHERE id = $3', [ranked[1].player_id, ranked[2].player_id, qualifier.id]);
      changes.push('qualifier_filled');
    }
  }

  const qScored = qualifier.home_player_id && qualifier.away_player_id && !(qualifier.home_goals === 0 && qualifier.away_goals === 0) && (qualifier.home_goals !== qualifier.away_goals || qualifier.penalty_winner_id);
  if (qScored && (!final.home_player_id || !final.away_player_id)) {
    const winnerId = qualifier.penalty_winner_id || (qualifier.home_goals > qualifier.away_goals ? qualifier.home_player_id : qualifier.away_player_id);
    const stats = {};
    for (const p of players) stats[p.id] = { player_id: p.id, name: p.name, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    for (const m of rr) {
      if (!stats[m.home_player_id] || !stats[m.away_player_id]) continue;
      if (m.home_goals === 0 && m.away_goals === 0) continue;
      stats[m.home_player_id].mp++; stats[m.away_player_id].mp++;
      stats[m.home_player_id].gf += m.home_goals; stats[m.home_player_id].ga += m.away_goals;
      stats[m.away_player_id].gf += m.away_goals; stats[m.away_player_id].ga += m.home_goals;
      if (m.home_goals > m.away_goals) { stats[m.home_player_id].w++; stats[m.home_player_id].pts += 3; stats[m.away_player_id].l++; }
      else if (m.home_goals < m.away_goals) { stats[m.away_player_id].w++; stats[m.away_player_id].pts += 3; stats[m.home_player_id].l++; }
      else { stats[m.home_player_id].d++; stats[m.away_player_id].d++; stats[m.home_player_id].pts++; stats[m.away_player_id].pts++; }
    }
    for (const s of Object.values(stats)) s.gd = s.gf - s.ga;
    const ranked = Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    if (ranked.length >= 1) {
      await pool.query('UPDATE matches SET home_player_id = $1, away_player_id = $2 WHERE id = $3', [ranked[0].player_id, winnerId, final.id]);
      changes.push('final_filled');
    }
  }

  return NextResponse.json({ changes });
}
