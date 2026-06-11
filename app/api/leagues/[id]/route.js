import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';
import { computeLeagueStatus } from '@/lib/constants';

export async function GET(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const r = await pool.query('SELECT * FROM leagues WHERE id = $1', [params.id]);
  if (!r.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const l = r.rows[0];
  const pc = (await pool.query('SELECT COUNT(*)::int AS c FROM league_participants WHERE league_id = $1', [l.id])).rows[0].c;
  const mc = (await pool.query('SELECT COUNT(*)::int AS c FROM matches WHERE league_id = $1', [l.id])).rows[0].c;
  return NextResponse.json({ ...l, player_count: pc, match_count: mc, status: await computeLeagueStatus(pool, l.id) });
}

export async function DELETE(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const { id } = params;
  await pool.query('DELETE FROM player_match_wins WHERE league_id = $1', [id]);
  await pool.query('DELETE FROM hall_of_fame WHERE league_id = $1', [id]);
  await pool.query('DELETE FROM league_participants WHERE league_id = $1', [id]);
  await pool.query('DELETE FROM matches WHERE league_id = $1', [id]);
  await pool.query('DELETE FROM leagues WHERE id = $1', [id]);
  return NextResponse.json({ success: true });
}
