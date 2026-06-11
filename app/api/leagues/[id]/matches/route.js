import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function GET(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const r = await pool.query(`
    SELECT m.*, hp.name AS home_player, ap.name AS away_player
    FROM matches m
    LEFT JOIN players hp ON m.home_player_id = hp.id
    LEFT JOIN players ap ON m.away_player_id = ap.id
    WHERE m.league_id = $1
    ORDER BY m.round ASC, m.match_index ASC, m.id ASC
  `, [params.id]);
  return NextResponse.json(r.rows);
}

export async function POST(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const { home_player_id, away_player_id, home_goals, away_goals } = await req.json();
  if (!home_player_id || !away_player_id || home_goals === undefined || away_goals === undefined) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }
  if (home_player_id === away_player_id) return NextResponse.json({ error: 'Player cannot play themselves' }, { status: 400 });
  const result = await pool.query(
    'INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [params.id, home_player_id, away_player_id, home_goals, away_goals]
  );
  return NextResponse.json({ id: result.rows[0].id });
}
