import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function GET() {
  await initDb();
  const pool = getPool();
  const r = await pool.query(`
    SELECT p.id AS player_id, p.name AS player_name, COALESCE(SUM(h.wins), 0)::int AS wins
    FROM hall_of_fame h
    JOIN players p ON h.player_id = p.id
    GROUP BY p.id, p.name
    ORDER BY wins DESC, p.name ASC
  `);
  return NextResponse.json(r.rows);
}
