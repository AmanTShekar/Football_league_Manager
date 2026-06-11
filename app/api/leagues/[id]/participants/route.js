import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';

export async function GET(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const r = await pool.query(`
    SELECT lp.id AS link_id, p.id, p.name
    FROM league_participants lp JOIN players p ON lp.player_id = p.id
    WHERE lp.league_id = $1 ORDER BY p.name ASC
  `, [params.id]);
  return NextResponse.json(r.rows);
}

export async function POST(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const { player_id } = await req.json();
  if (!player_id) return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
  const existing = await pool.query('SELECT id FROM league_participants WHERE league_id = $1 AND player_id = $2', [params.id, player_id]);
  if (existing.rows.length) return NextResponse.json({ error: 'Player already in this league' }, { status: 400 });
  const result = await pool.query('INSERT INTO league_participants (league_id, player_id) VALUES ($1, $2) RETURNING id', [params.id, player_id]);
  return NextResponse.json({ id: result.rows[0].id, player_id, league_id: parseInt(params.id) });
}
