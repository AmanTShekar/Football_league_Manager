import { NextResponse } from 'next/server';
import { getPool, initDb } from '@/lib/db';
import { shuffle } from '@/lib/constants';

export async function POST(req, { params: p }) { const params = await p;
  await initDb();
  const pool = getPool();
  const league = await pool.query('SELECT legs FROM leagues WHERE id = $1', [params.id]);
  const legs = Math.max(1, league.rows[0]?.legs || 1);
  const players = await pool.query('SELECT player_id FROM league_participants WHERE league_id = $1', [params.id]);
  if (players.rows.length < 2) return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 });
  const existing = await pool.query('SELECT COUNT(*)::int AS c FROM matches WHERE league_id = $1', [params.id]);
  if (existing.rows[0].c > 0) return NextResponse.json({ error: 'Delete existing matches first' }, { status: 400 });
  const shuffled = shuffle(players.rows.map(t => t.player_id));
  const client = await pool.connect();
  let total = 0;
  try {
    await client.query('BEGIN');
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index, leg) VALUES ($1, $2, $3, 0, 0, 1, $4, 1)', [params.id, shuffled[i], shuffled[i + 1], i / 2]);
        total++;
        if (legs >= 2) {
          await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index, leg) VALUES ($1, $2, $3, 0, 0, 1, $4, 2)', [params.id, shuffled[i + 1], shuffled[i], i / 2]);
          total++;
        }
      } else {
        await client.query('INSERT INTO matches (league_id, home_player_id, away_player_id, home_goals, away_goals, round, match_index) VALUES ($1, $2, $2, 0, 0, 1, $3)', [params.id, shuffled[i], i / 2]);
        total++;
      }
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  return NextResponse.json({ count: total });
}
