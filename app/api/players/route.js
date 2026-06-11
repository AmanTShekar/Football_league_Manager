import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function GET() {
  await initDb();
  const pool = getPool();
  const r = await pool.query('SELECT * FROM players ORDER BY name ASC');
  return NextResponse.json(r.rows);
}

export async function POST(req) {
  await initDb();
  const pool = getPool();
  const { name } = await req.json();
  if (!name || !name.trim()) return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
  const existing = await pool.query('SELECT id FROM players WHERE name = $1', [name.trim()]);
  if (existing.rows.length) return NextResponse.json({ error: 'Player already exists' }, { status: 400 });
  const result = await pool.query('INSERT INTO players (name) VALUES ($1) RETURNING id', [name.trim()]);
  return NextResponse.json({ id: result.rows[0].id, name: name.trim() });
}
