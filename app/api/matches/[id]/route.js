import { NextResponse } from 'next/server';
import { getPool, initDb, detectChampion } from '@/lib/db';

export async function PUT(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const { home_goals, away_goals, penalty_winner_id } = await req.json();
  if (home_goals === undefined || away_goals === undefined) return NextResponse.json({ error: 'Goals required' }, { status: 400 });
  const m = await pool.query('SELECT * FROM matches WHERE id = $1', [params.id]);
  if (!m.rows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  const match = m.rows[0];

  await pool.query('DELETE FROM player_match_wins WHERE match_id = $1', [params.id]);
  await pool.query('UPDATE matches SET home_goals = $1, away_goals = $2, penalty_winner_id = $3 WHERE id = $4', [home_goals, away_goals, penalty_winner_id || null, params.id]);

  const winnerId = penalty_winner_id || (home_goals !== away_goals ? (home_goals > away_goals ? match.home_player_id : match.away_player_id) : null);
  if (winnerId) {
    await pool.query('INSERT INTO player_match_wins (player_id, match_id, league_id) VALUES ($1, $2, $3)', [winnerId, match.id, match.league_id]);
  }

  const championId = await detectChampion(pool, match.league_id);
  if (championId) {
    await pool.query(`
      DELETE FROM hall_of_fame WHERE league_id = $1
    `, [match.league_id]);
    await pool.query(`
      INSERT INTO hall_of_fame (player_id, league_id, wins, created_at)
      VALUES ($1, $2, 1, NOW())
    `, [championId, match.league_id]);
  }
  return NextResponse.json({ success: true, league_id: match.league_id, champion: !!championId });
}

export async function DELETE(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const match = await pool.query('SELECT league_id FROM matches WHERE id = $1', [params.id]);
  if (!match.rows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  await pool.query('DELETE FROM player_match_wins WHERE match_id = $1', [params.id]);
  await pool.query('DELETE FROM matches WHERE id = $1', [params.id]);
  return NextResponse.json({ success: true, league_id: match.rows[0].league_id });
}
