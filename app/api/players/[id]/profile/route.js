import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function GET(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const player = await pool.query('SELECT * FROM players WHERE id = $1', [params.id]);
  if (!player.rows.length) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  const hof = await pool.query('SELECT COALESCE(SUM(wins), 0)::int AS total_wins FROM hall_of_fame WHERE player_id = $1', [params.id]);
  return NextResponse.json({ ...player.rows[0], total_wins: hof.rows[0].total_wins });
}
