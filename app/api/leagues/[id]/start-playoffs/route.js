import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';
import { playerColor } from '@/lib/constants';

export async function POST(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const league = await pool.query('SELECT id, type FROM leagues WHERE id = $1', [params.id]);
  if (!league.rows.length) return NextResponse.json({ error: 'League not found' }, { status: 404 });
  if (league.rows[0].type !== 'league') return NextResponse.json({ error: 'Only round-robin leagues can have playoffs' }, { status: 400 });
  const players = (await pool.query('SELECT p.id, p.name FROM league_participants lp JOIN players p ON lp.player_id = p.id WHERE lp.league_id = $1', [params.id])).rows;
  const matches = (await pool.query('SELECT * FROM matches WHERE league_id = $1', [params.id])).rows;
  const unplayed = matches.filter(m => m.home_goals === 0 && m.away_goals === 0);
  if (unplayed.length > 0) return NextResponse.json({ error: 'All round-robin matches must be played first' }, { status: 400 });
  const stats = {};
  for (const p of players) stats[p.id] = { player_id: p.id, name: p.name, color: playerColor(p.id), pts: 0, gd: 0, gf: 0 };
  for (const m of matches) {
    if (!stats[m.home_player_id] || !stats[m.away_player_id]) continue;
    stats[m.home_player_id].gf += m.home_goals; stats[m.home_player_id].gd += m.home_goals - m.away_goals;
    stats[m.away_player_id].gf += m.away_goals; stats[m.away_player_id].gd += m.away_goals - m.home_goals;
    if (m.home_goals > m.away_goals) stats[m.home_player_id].pts += 3;
    else if (m.home_goals < m.away_goals) stats[m.away_player_id].pts += 3;
    else { stats[m.home_player_id].pts += 1; stats[m.away_player_id].pts += 1; }
  }
  const sorted = Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
  if (sorted.length < 3) return NextResponse.json({ error: 'Need at least 3 players for playoffs' }, { status: 400 });
  const existingPlayoff = matches.filter(m => m.round > 1);
  if (existingPlayoff.length > 0) return NextResponse.json({ error: 'Delete existing playoff matches first' }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index) VALUES ($1, $2, $3, 0, 0, 2, 0)', [params.id, sorted[1].player_id, sorted[2].player_id]);
    await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index) VALUES ($1, $2, $3, 0, 0, 3, 0)', [params.id, sorted[0].player_id, sorted[1].player_id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  return NextResponse.json({
    success: true,
    first: { id: sorted[0].player_id, name: sorted[0].name },
    second: { id: sorted[1].player_id, name: sorted[1].name },
    third: { id: sorted[2].player_id, name: sorted[2].name },
  });
}
