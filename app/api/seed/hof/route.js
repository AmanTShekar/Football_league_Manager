import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function POST() {
  await initDb();
  const pool = getPool();

  const getId = async (name) => {
    const r = await pool.query('SELECT id FROM players WHERE name = $1', [name]);
    return r.rows.length ? r.rows[0].id : null;
  };

  const pranavId = await getId('Pranav');
  const rizwinId = await getId('Rizwin');

  if (!pranavId) return NextResponse.json({ error: 'Pranav not found. Create them first.' }, { status: 400 });
  if (!rizwinId) return NextResponse.json({ error: 'Rizwin not found. Create them first.' }, { status: 400 });

  await pool.query('DELETE FROM hall_of_fame WHERE league_id IS NULL');
  await pool.query('INSERT INTO hall_of_fame (player_id, wins, created_at) VALUES ($1, 4, NOW())', [pranavId]);
  await pool.query('INSERT INTO hall_of_fame (player_id, wins, created_at) VALUES ($1, 3, NOW())', [rizwinId]);

  return NextResponse.json({ seeded: true, entries: [{ player: 'Pranav', wins: 4 }, { player: 'Rizwin', wins: 3 }] });
}
