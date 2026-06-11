import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function GET(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const r = await pool.query(`
    SELECT pmw.id, pmw.match_id, pmw.league_id,
           m.home_player_id, m.away_player_id, m.home_goals, m.away_goals, m.round,
           hp.name AS home_team, ap.name AS away_team, l.name AS league_name
    FROM player_match_wins pmw
    JOIN matches m ON pmw.match_id = m.id
    JOIN players hp ON m.home_player_id = hp.id
    JOIN players ap ON m.away_player_id = ap.id
    JOIN leagues l ON pmw.league_id = l.id
    WHERE pmw.player_id = $1
    ORDER BY m.id DESC
  `, [params.id]);
  return NextResponse.json(r.rows);
}
