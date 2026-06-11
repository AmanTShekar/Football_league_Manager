import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function POST(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const semi = (await pool.query('SELECT * FROM matches WHERE league_id = $1 AND round = 2 LIMIT 1', [params.id])).rows[0];
  if (!semi) return NextResponse.json({ error: 'No semi-final match found' }, { status: 400 });
  if (semi.home_goals === 0 && semi.away_goals === 0) {
    return NextResponse.json({ error: 'Semi-final must have a winner' }, { status: 400 });
  }
  if (semi.home_goals === semi.away_goals && !semi.penalty_winner_id) {
    return NextResponse.json({ error: 'Semi-final is drawn. Set a penalty winner.' }, { status: 400 });
  }
  const semiWinner = semi.penalty_winner_id || (semi.home_goals > semi.away_goals ? semi.home_player_id : semi.away_player_id);
  await pool.query('UPDATE matches SET away_player_id = $1 WHERE league_id = $2 AND round = 3', [semiWinner, params.id]);
  return NextResponse.json({ success: true, semi_winner_id: semiWinner });
}
