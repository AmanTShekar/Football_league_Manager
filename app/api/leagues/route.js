import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';
import { computeLeagueStatus, playerColor } from '@/lib/constants';

export async function GET() {
  await initDb();
  const pool = getPool();
  const r = await pool.query(`
    SELECT l.*,
      (SELECT COUNT(*)::int FROM league_participants WHERE league_id = l.id) AS player_count,
      (SELECT COUNT(*)::int FROM matches WHERE league_id = l.id) AS match_count
    FROM leagues l ORDER BY l.id DESC
  `);
  const enriched = await Promise.all(r.rows.map(async (l) => ({ ...l, status: await computeLeagueStatus(pool, l.id) })));
  return NextResponse.json(enriched);
}

export async function POST(req) {
  await initDb();
  const pool = getPool();
  const { name, type, legs: rawLegs } = await req.json();
  if (!name || !name.trim()) return NextResponse.json({ error: 'League name is required' }, { status: 400 });
  const existing = await pool.query('SELECT id FROM leagues WHERE name = $1', [name.trim()]);
  if (existing.rows.length) return NextResponse.json({ error: 'League name already exists' }, { status: 400 });
  const t = type === 'knockout' ? 'knockout' : 'league';
  const legs = Math.max(1, parseInt(rawLegs) || 1);
  const result = await pool.query('INSERT INTO leagues (name, type, legs) VALUES ($1, $2, $3) RETURNING id', [name.trim(), t, legs]);
  return NextResponse.json({ id: result.rows[0].id, name: name.trim(), type: t, legs, player_count: 0, match_count: 0, status: 'draft' });
}
