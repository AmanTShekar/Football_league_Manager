import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';
import { playerColor } from '@/lib/constants';

export async function GET(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const league = await pool.query('SELECT type FROM leagues WHERE id = $1', [params.id]);
  if (!league.rows.length) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  const allMatches = (await pool.query('SELECT * FROM matches WHERE league_id = $1 ORDER BY round ASC, match_index ASC', [params.id])).rows;
  const players = (await pool.query(`
    SELECT p.id, p.name FROM league_participants lp JOIN players p ON lp.player_id = p.id WHERE lp.league_id = $1 ORDER BY p.name
  `, [params.id])).rows;

  if (league.rows[0].type === 'knockout') {
    const maxRound = allMatches.reduce((m, r) => Math.max(m, r.round), 1);
    const mapped = players.map(p => ({ id: p.id, name: p.name, color: playerColor(p.id) }));
    return NextResponse.json({ type: 'knockout', teams: mapped, matches: allMatches, maxRound });
  }

  const matches = allMatches.filter(m => m.round === 1);
  const stats = {};
  for (const p of players) {
    stats[p.id] = { player_id: p.id, name: p.name, color: playerColor(p.id), mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }
  for (const m of matches) {
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
  const standings = Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  }).map((s, i) => ({ ...s, position: i + 1 }));
  return NextResponse.json({ type: 'league', standings });
}
