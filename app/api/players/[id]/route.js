import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function DELETE(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const { id } = params;
  await pool.query('DELETE FROM league_participants WHERE player_id = $1', [id]);
  await pool.query('DELETE FROM player_match_wins WHERE player_id = $1', [id]);
  await pool.query('DELETE FROM hall_of_fame WHERE player_id = $1', [id]);
  await pool.query('DELETE FROM matches WHERE home_player_id = $1 OR away_player_id = $1', [id]);
  await pool.query('DELETE FROM players WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
